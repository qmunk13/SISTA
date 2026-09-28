import React, { useState } from 'react';
import {
  FileText,
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Eye,
  Trash2,
  Send,
  UserCheck,
  Calendar,
  AlertCircle,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { User, PengajuanIzin } from '../types';
import {
  getSiswaList,
  getPengajuanIzinList,
  submitPengajuanIzin,
  updateStatusPengajuanIzin,
  deletePengajuanIzin,
  getTodayDateString
} from '../lib/storage';
import { syncRecordsToGoogleSheets } from '../lib/googleSheetsSync';

interface KelolaIzinViewProps {
  currentUser: User;
}

export const KelolaIzinView: React.FC<KelolaIzinViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'daftar' | 'form'>('daftar');
  const [izinList, setIzinList] = useState<PengajuanIzin[]>(getPengajuanIzinList());
  const siswaList = getSiswaList();

  // Form State
  const [selectedNisn, setSelectedNisn] = useState<string>('');
  const [tanggalMulai, setTanggalMulai] = useState<string>(getTodayDateString());
  const [tanggalSelesai, setTanggalSelesai] = useState<string>(getTodayDateString());
  const [jenisIzin, setJenisIzin] = useState<'Sakit' | 'Izin' | 'Dispensasi' | 'Lainnya'>('Izin');
  const [alasan, setAlasan] = useState<string>('');
  const [buktiFotoUrl, setBuktiFotoUrl] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filters State
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [filterKelas, setFilterKelas] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Lightbox State
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);

  const refreshData = () => {
    setIzinList(getPengajuanIzinList());
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'Ukuran foto maksimal 5 MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setBuktiFotoUrl(base64);
        setPreviewImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNisn) {
      setFeedback({ type: 'error', message: 'Pilih siswa terlebih dahulu.' });
      return;
    }
    if (!alasan.trim()) {
      setFeedback({ type: 'error', message: 'Isi alasan izin secara rinci.' });
      return;
    }

    const siswa = siswaList.find(s => s.nisn === selectedNisn);
    if (!siswa) {
      setFeedback({ type: 'error', message: 'Data siswa tidak ditemukan.' });
      return;
    }

    const res = submitPengajuanIzin({
      nisn: siswa.nisn,
      nama: siswa.nama,
      kelas: siswa.kelas,
      tanggalMulai,
      tanggalSelesai,
      jenisIzin,
      alasan,
      buktiFotoUrl
    });

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setSelectedNisn('');
      setAlasan('');
      setBuktiFotoUrl('');
      setPreviewImage(null);
      refreshData();
      setActiveTab('daftar');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleApprove = (id: string) => {
    const res = updateStatusPengajuanIzin(id, 'Disetujui', currentUser.nama || 'Petugas/Wali Kelas');
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      refreshData();
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReject = (id: string) => {
    const res = updateStatusPengajuanIzin(id, 'Ditolak', currentUser.nama || 'Petugas/Wali Kelas');
    if (res.success) {
      setFeedback({ type: 'error', message: res.message });
      refreshData();
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pengajuan izin ini?')) {
      deletePengajuanIzin(id);
      refreshData();
    }
  };

  const handleSyncGAS = async () => {
    setSyncing(true);
    const result = await syncRecordsToGoogleSheets(izinList, 'izin');
    setSyncing(false);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // Filter List
  const filteredList = izinList.filter(item => {
    const matchStatus = filterStatus === 'semua' || item.statusPersetujuan.toLowerCase() === filterStatus.toLowerCase();
    const matchKelas = !filterKelas || item.kelas === filterKelas;
    const matchSearch = !searchQuery ||
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nisn.includes(searchQuery) ||
      item.alasan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchKelas && matchSearch;
  });

  const uniqueClasses = Array.from(new Set(siswaList.map(s => s.kelas))).sort();

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Pengajuan & Persetujuan Izin Siswa</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Logika Cerdas: Bukti foto & alasan terverifikasi langsung memperbarui status presensi siswa.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleSyncGAS}
            disabled={syncing}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Menyinkronkan...' : 'Sync Google Sheets'}</span>
          </button>

          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'form'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>+ Ajukan Izin / Surat</span>
          </button>

          <button
            onClick={() => setActiveTab('daftar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'daftar'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Daftar Pengajuan ({izinList.length})</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TAB FORM PENGAJUAN */}
      {activeTab === 'form' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Form Pengajuan Izin / Surat Dokter</h3>
              <p className="text-xs text-slate-500">Unggah bukti foto penjelas (surat dokter / nota izin orang tua) dan beri alasan.</p>
            </div>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih Siswa *</label>
              <select
                value={selectedNisn}
                onChange={e => setSelectedNisn(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 transition"
                required
              >
                <option value="">-- Pilih Siswa dari Daftar --</option>
                {siswaList.map(s => (
                  <option key={s.id} value={s.nisn}>
                    {s.nama} ({s.nisn}) - Kelas {s.kelas}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mulai Tanggal *</label>
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={e => setTanggalMulai(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Sampai Tanggal *</label>
                <input
                  type="date"
                  value={tanggalSelesai}
                  onChange={e => setTanggalSelesai(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori Izin *</label>
                <select
                  value={jenisIzin}
                  onChange={e => setJenisIzin(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="Izin">Izin (Acara Keluarga/Pribadi)</option>
                  <option value="Sakit">Sakit (Demam/Opname/Rawat)</option>
                  <option value="Dispensasi">Dispensasi (Lomba/Tugas Sekolah)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Alasan Lengkap *</label>
              <textarea
                value={alasan}
                onChange={e => setAlasan(e.target.value)}
                placeholder="Tuliskan alasan lengkap izin, contoh: Demam tinggi sejak tadi malam, berobat ke puskesmas..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-indigo-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Unggah Bukti Foto (Surat Dokter / Surat Orang Tua)</label>
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 rounded-2xl p-4 text-center cursor-pointer transition relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Upload className="w-6 h-6 text-indigo-500" />
                  <p className="text-xs font-medium text-slate-600">Klik atau seret foto surat izin di sini</p>
                  <p className="text-[10px] text-slate-400">Format: JPG, PNG, WEBP (Maks 5 MB)</p>
                </div>
              </div>

              {previewImage && (
                <div className="mt-3 p-3 bg-slate-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={previewImage} alt="Preview Bukti" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">Bukti Foto Terlampir</p>
                      <p className="text-[10px] text-slate-400">Siap dikirim ke wali kelas & sistem</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setBuktiFotoUrl(''); setPreviewImage(null); }}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('daftar')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Pengajuan Izin</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB DAFTAR PENGAJUAN */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Persetujuan</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="semua">Semua Status</option>
                <option value="pending">Pending (Perlu Review)</option>
                <option value="disetujui">Disetujui</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kelas</label>
              <select
                value={filterKelas}
                onChange={e => setFilterKelas(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="">Semua Kelas</option>
                {uniqueClasses.map(c => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cari Nama / NISN / Alasan</label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ketik kata kunci..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Cards Grid */}
          {filteredList.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-slate-700">Belum Ada Data Pengajuan Izin</h3>
              <p className="text-xs text-slate-400 mt-1">Gunakan tombol "+ Ajukan Izin / Surat" untuk mengajukan permohonan izin baru.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredList.map(item => (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-4"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">{item.nama}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                          {item.kelas}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">NISN: {item.nisn} • Diajukan: {item.tanggalPengajuan}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        item.statusPersetujuan === 'Disetujui'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.statusPersetujuan === 'Ditolak'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.statusPersetujuan === 'Disetujui' && <CheckCircle2 className="w-3 h-3" />}
                      {item.statusPersetujuan === 'Ditolak' && <XCircle className="w-3 h-3" />}
                      {item.statusPersetujuan === 'Pending' && <Clock className="w-3 h-3" />}
                      <span>{item.statusPersetujuan}</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-indigo-600 uppercase tracking-wide">Kategori: {item.jenisIzin}</span>
                      <span className="font-mono text-slate-500">
                        {item.tanggalMulai} s/d {item.tanggalSelesai}
                      </span>
                    </div>

                    <p className="text-slate-700 italic">"{item.alasan}"</p>
                  </div>

                  {/* Bukti Foto & Lightbox Action */}
                  <div className="flex items-center justify-between pt-1">
                    {item.buktiFotoUrl ? (
                      <button
                        onClick={() => setSelectedPhoto(item.buktiFotoUrl!)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Lihat Bukti Foto</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Tanpa lampiran foto</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {item.statusPersetujuan === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Setujui dan otomatis update presensi siswa"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                        title="Hapus Pengajuan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX FOTO PROOF MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-xs flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>Bukti Foto Surat Izin / Surat Dokter</span>
              </h4>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-slate-950 flex items-center justify-center min-h-[300px]">
              <img src={selectedPhoto} alt="Bukti Foto Izin" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-900"
              >
                Tutup Tampilan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
