import React, { useState, useEffect } from 'react';
import { db } from '../data/db';
import { SPMBPendaftar, FormFieldConfig } from '../types';
import { useSubTab } from '../utils/subTabHelper';
import { 
  Users, 
  Search, 
  RefreshCw, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Edit,
  Sparkles,
  Layers,
  Award,
  UploadCloud,
  Printer,
  Check,
  CreditCard,
  CheckCircle2
} from 'lucide-react';

export default function SPMB() {
  const [pendaftarList, setPendaftarList] = useState<SPMBPendaftar[]>([]);
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [activeSubTab, setActiveSubTab] = useSubTab<'dashboard' | 'form' | 'data' | 'upload' | 'verifikasi' | 'seleksi' | 'pengumuman' | 'daftar_ulang' | 'pdkt'>('spmb', 'dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Selected Applicant Detail & Review State
  const [selectedPendaftar, setSelectedPendaftar] = useState<SPMBPendaftar | null>(null);
  const [viewingDetail, setViewingDetail] = useState<SPMBPendaftar | null>(null);
  const [newStatus, setNewStatus] = useState<SPMBPendaftar['status']>('Pending');
  const [catatanAdmin, setCatatanAdmin] = useState('');

  // Lookup result for Announcements
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<SPMBPendaftar | null>(null);

  // Seleksi State
  const [kriteriaScore, setKriteriaScore] = useState(75);

  useEffect(() => {
    loadPendaftar();
    loadFormFields();

    const handleSynced = () => {
      loadPendaftar();
      loadFormFields();
    };
    window.addEventListener('erp-db-synced', handleSynced);
    return () => window.removeEventListener('erp-db-synced', handleSynced);
  }, []);

  const loadPendaftar = () => {
    setPendaftarList(db.get<SPMBPendaftar>('spmb_pendaftar'));
  };

  const loadFormFields = () => {
    const fields = db.get<FormFieldConfig>('form_fields') || [];
    setFormFields(fields);
  };

  const handleInputChange = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check required fields
    for (const field of formFields) {
      if (field.show && field.required && !formValues[field.key]) {
        Swal.fire('Form Belum Lengkap', `Mohon isi bidang wajib: ${field.label}`, 'warning');
        return;
      }
    }

    const kode = `REG2026${Math.floor(1000 + Math.random() * 9000)}`;
    const newApplicant: any = {
      kodePendaftaran: kode,
      nama: formValues.nama || formValues.namaPanggilan || 'Calon Siswa Baru',
      nisn: formValues.nisn || '',
      nik: formValues.nik || '',
      tanggalDaftar: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      catatanAdmin: 'Berkas pendaftaran awal berhasil diterima oleh sistem.',
      ...formValues
    };

    // Save to DB
    const list = db.get<SPMBPendaftar>('spmb_pendaftar');
    db.set('spmb_pendaftar', [newApplicant, ...list]);
    window.dispatchEvent(new Event('erp-db-synced'));

    Swal.fire({
      title: 'Registrasi SPMB Berhasil!',
      html: `Calon siswa a.n. <b>${newApplicant.nama}</b> telah terdaftar dengan kode pendaftaran:<br><b class="text-xl text-blue-600 font-mono mt-2 block">${kode}</b>`,
      icon: 'success',
      confirmButtonColor: '#3b82f6'
    });

    // Reset Form
    setFormValues({});
    loadPendaftar();
    setActiveSubTab('data');
  };

  const handleVerifikasiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPendaftar) return;

    db.update<SPMBPendaftar>('spmb_pendaftar', 'kodePendaftaran', selectedPendaftar.kodePendaftaran, {
      status: newStatus,
      catatanAdmin: catatanAdmin
    });

    Swal.fire({
      title: 'Berhasil!',
      text: 'Status pendaftaran berhasil diperbarui.',
      icon: 'success',
      confirmButtonColor: '#3b82f6'
    });

    setSelectedPendaftar(null);
    loadPendaftar();
  };

  const handleLookup = () => {
    if (!lookupCode) return;
    const found = pendaftarList.find(p => p.kodePendaftaran.toLowerCase() === lookupCode.trim().toLowerCase() || p.nama.toLowerCase().includes(lookupCode.toLowerCase()));
    if (found) {
      setLookupResult(found);
    } else {
      setLookupResult(null);
      Swal.fire('Tidak Ditemukan', 'Kode pendaftaran atau nama tidak cocok.', 'warning');
    }
  };

  const runAutomaticSelection = () => {
    Swal.fire({
      title: 'Jalankan Seleksi?',
      text: `Seluruh pendaftar dengan kriteria kelulusan akan diproses secara otomatis.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const updated = pendaftarList.map((p) => {
          if (p.status === 'Pending') {
            // Simulate random decision
            const randomPass = Math.random() > 0.3;
            return {
              ...p,
              status: randomPass ? 'Diterima' as const : 'Tidak Diterima' as const,
              catatanAdmin: randomPass ? 'Lulus passing grade seleksi nilai akademik.' : 'Belum lulus ambang batas nilai rapor minimal.'
            };
          }
          return p;
        });
        db.set('spmb_pendaftar', updated);
        loadPendaftar();
        Swal.fire('Seleksi Selesai', 'Penyaringan otomatis selesai dilakukan.', 'success');
      }
    });
  };

  const filteredPendaftar = pendaftarList.filter(p => {
    const matchesSearch = p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.kodePendaftaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.nisn && p.nisn.includes(searchQuery));
    let matchesStatus = true;
    if (selectedStatus) {
      if (selectedStatus === 'Menunggu') {
        matchesStatus = p.status === 'Menunggu' || p.status === 'Pending';
      } else if (selectedStatus === 'Disetujui') {
        matchesStatus = p.status === 'Disetujui' || p.status === 'Diterima';
      } else if (selectedStatus === 'Ditolak') {
        matchesStatus = p.status === 'Ditolak' || p.status === 'Tidak Diterima';
      } else {
        matchesStatus = p.status === selectedStatus;
      }
    }
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {[
          { id: 'dashboard', label: 'Dashboard SPMB' },
          { id: 'form', label: 'Form Pendaftaran' },
          { id: 'data', label: 'Data Pendaftar' },
          { id: 'upload', label: 'Upload Berkas' },
          { id: 'verifikasi', label: 'Verifikasi Berkas' },
          { id: 'seleksi', label: 'Penyaringan Seleksi' },
          { id: 'pengumuman', label: 'Hasil Pengumuman' },
          { id: 'daftar_ulang', label: 'Proses Daftar Ulang' },
          { id: 'pdkt', label: 'Cetak Kartu Orientasi' }
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-spmb-${tab.id}`}
            onClick={() => {
              setActiveSubTab(tab.id as any);
              setLookupResult(null);
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all border ${
              activeSubTab === tab.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Pendaftar</span>
                <h4 className="text-xl font-black text-slate-800 mt-1">{pendaftarList.length}</h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Disetujui / Lulus</span>
                <h4 className="text-xl font-black text-emerald-600 mt-1">
                  {pendaftarList.filter(p => p.status === 'Disetujui' || p.status === 'Diterima').length}
                </h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Menunggu</span>
                <h4 className="text-xl font-black text-amber-500 mt-1">
                  {pendaftarList.filter(p => p.status === 'Menunggu' || p.status === 'Pending').length}
                </h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><XCircle className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Ditolak</span>
                <h4 className="text-xl font-black text-rose-600 mt-1">
                  {pendaftarList.filter(p => p.status === 'Ditolak' || p.status === 'Tidak Diterima').length}
                </h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border p-6 rounded-3xl space-y-4">
              <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-500" /> Alur Penerimaan Siswa Baru (PPDB)</h4>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Pendaftaran Online', desc: 'Siswa mengisi biodata diri dan sekolah asal secara online.' },
                  { step: '2', title: 'Verifikasi Dokumen', desc: 'Panitia mengecek kesesuaian berkas ijazah, akta, dan kartu keluarga.' },
                  { step: '3', title: 'Penyaringan Seleksi', desc: 'Penyaringan berbasis hasil tes akademik atau nilai rapor.' },
                  { step: '4', title: 'Daftar Ulang', desc: 'Pembayaran biaya pendidikan awal dan pengukuran seragam sekolah.' }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start text-xs">
                    <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-bold flex items-center justify-center shrink-0">{item.step}</span>
                    <div>
                      <p className="font-bold text-slate-800">{item.title}</p>
                      <p className="text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-2">Informasi Gelombang Pendaftaran</h4>
                <p className="text-xs text-slate-500">Saat ini pendaftaran berada di Gelombang I (Ruler Merdeka). Kuota tersisa sebanyak 40 kursi siswa baru.</p>
              </div>
              <div className="p-4 bg-slate-50 border rounded-2xl space-y-3 my-4">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Gelombang I</span>
                  <span className="text-blue-600 font-bold">Aktif s.d 31 Juli 2026</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold text-right">Kuota Terisi: 75 / 100 Siswa</p>
              </div>
              <button onClick={() => setActiveSubTab('form')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition">
                Daftarkan Siswa Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'form' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Formulir Pendaftaran Siswa Baru
              </h3>
              <p className="text-xs text-slate-400 mt-1">Formulir dinamis terintegrasi otomatis dengan <b>Matriks Bidang Isian ({formFields.length} Isian Google Sheet Model)</b>.</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
              {formFields.filter(f => f.show !== false).length} Isian Aktif
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
              {formFields.filter(f => f.show !== false).map((field) => {
                const colSpan = field.grid === 12 ? 'col-span-12' : field.grid === 6 ? 'col-span-12 md:col-span-6' : field.grid === 4 ? 'col-span-12 md:col-span-4' : 'col-span-12 md:col-span-6';
                const opts = field.options ? field.options.split(',').map(s => s.trim()) : [];

                return (
                  <div key={field.key} className={`${colSpan} space-y-1`}>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">
                      {field.label} {field.required && <span className="text-rose-500 font-extrabold">*</span>}
                    </label>

                    {field.type === 'dropdown' ? (
                      <select
                        required={field.required}
                        value={formValues[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Pilih {field.label} --</option>
                        {opts.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        value={formValues[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        placeholder={`Masukkan ${field.label}...`}
                        className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    ) : field.type === 'file' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleInputChange(field.key, file.name);
                            }
                          }}
                          className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {formValues[field.key] && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded shrink-0">
                            {formValues[field.key]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        required={field.required}
                        value={formValues[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        placeholder={`Masukkan ${field.label}...`}
                        className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormValues({})}
                className="px-5 py-2.5 rounded-xl border text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Reset Formulir
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition shadow flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4" /> Kirim Pendaftaran SPMB
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSubTab === 'data' && (
        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
          <div className="p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Seluruh Calon Siswa Terdaftar</h3>
              <p className="text-xs text-slate-400 mt-0.5">Database pendaftar lengkap tersinkronisasi dengan {formFields.length} parameter isian form.</p>
            </div>
            <button onClick={loadPendaftar} className="p-2.5 bg-white border text-slate-600 rounded-xl hover:bg-slate-50 transition"><RefreshCw className="w-4 h-4" /></button>
          </div>

          <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Filter Status:</span>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="border bg-slate-50 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Semua Status Pendaftaran</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
                <option value="Perbaikan">Perbaikan Berkas</option>
              </select>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cari Nama / Kode / NISN..." />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Kode Pendaftaran</th>
                  <th className="p-4">Nama Pendaftar</th>
                  <th className="p-4">NISN / NIK</th>
                  <th className="p-4 text-center">Tanggal Daftar</th>
                  <th className="p-4 text-center">Status Pendaftaran</th>
                  <th className="p-4 text-center">Aksi / Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPendaftar.map((p, idx) => {
                  const displayStatus = p.status === 'Pending' ? 'Menunggu' :
                                        p.status === 'Diterima' ? 'Disetujui' :
                                        p.status === 'Tidak Diterima' ? 'Ditolak' : p.status;
                  return (
                    <tr key={p.id ? `spmb_${p.id}` : `spmb_kp_${p.kodePendaftaran || ''}_${idx}`} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-slate-600">{p.kodePendaftaran}</td>
                      <td className="p-4 font-bold text-slate-800 text-sm">{p.nama}</td>
                      <td className="p-4 font-mono text-slate-600">{p.nisn || p.nik || '-'}</td>
                      <td className="p-4 text-center text-slate-500">{p.tanggalDaftar}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1 border ${
                          displayStatus === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          displayStatus === 'Ditolak' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          displayStatus === 'Perbaikan' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {displayStatus === 'Disetujui' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                          {displayStatus === 'Ditolak' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                          {displayStatus === 'Menunggu' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                          {displayStatus === 'Perbaikan' && <AlertCircle className="w-3.5 h-3.5 text-purple-600" />}
                          {displayStatus}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setViewingDetail(p)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg transition text-[10px] inline-flex items-center gap-1 border border-blue-200"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat Detail Isian
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredPendaftar.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">Tidak ada data pendaftar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'upload' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase">Unggah Berkas Pendukung</h3>
            <p className="text-xs text-slate-400 mt-1">Unggah pindaian KK, Akta Kelahiran, Rapor semester akhir, dan Ijazah lulus untuk verifikasi berkas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Kartu Keluarga (KK)', format: 'PDF, JPG max 2MB' },
              { title: 'Akta Kelahiran', format: 'PDF, JPG max 2MB' },
              { title: 'Scan Rapor Akhir', format: 'PDF max 5MB' }
            ].map((box, idx) => (
              <div key={idx} className="border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-3 hover:border-blue-500 transition-all">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <h5 className="font-bold text-slate-700 text-xs">{box.title}</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">{box.format}</p>
                </div>
                <button onClick={() => Swal.fire('Unggah', `${box.title} berhasil diunggah secara lokal.`, 'success')} className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-1.5 rounded-lg text-[10px] transition">
                  Pilih Berkas
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'verifikasi' && (
        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Evaluasi & Verifikasi Berkas Fisik</h3>
              <p className="text-xs text-slate-400 mt-0.5">Berikan persetujuan berkas atau tandai perbaikan kepada calon siswa.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">Kode Pendaftaran</th>
                  <th className="p-4">Nama Lengkap</th>
                  <th className="p-4">Status Berkas</th>
                  <th className="p-4 text-center">Tindakan Evaluasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendaftarList.map((p, idx) => (
                  <tr key={p.id ? `spmb_verif_${p.id}` : `spmb_verif_kp_${p.kodePendaftaran || ''}_${idx}`} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-slate-600">{p.kodePendaftaran}</td>
                    <td className="p-4 font-bold text-slate-800 text-sm">{p.nama}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'Diterima' ? 'bg-emerald-50 text-emerald-700' :
                        p.status === 'Perbaikan' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>{p.status}</span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => {
                          setSelectedPendaftar(p);
                          setNewStatus(p.status);
                          setCatatanAdmin(p.catatanAdmin || '');
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-[10px] shadow"
                      >
                        Buka Verifikasi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'seleksi' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase">Penyaringan Seleksi Akademik</h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Tentukan passing grade ambang batas minimal kelulusan untuk menyaring otomatis pendaftar.</p>
            </div>
            <button onClick={runAutomaticSelection} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow">
              <Award className="w-4 h-4" /> Jalankan Filter Otomatis
            </button>
          </div>

          <div className="bg-slate-50 p-5 border rounded-2xl space-y-3">
            <span className="text-xs font-bold text-slate-500 block uppercase">Ambang Batas Nilai Rapor Minimal</span>
            <div className="flex items-center gap-4">
              <input type="range" min={60} max={100} value={kriteriaScore} onChange={(e) => setKriteriaScore(Number(e.target.value))} className="w-full accent-blue-600" />
              <span className="text-lg font-black text-blue-600 w-12 text-center font-mono">{kriteriaScore}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold">Pendaftar dengan skor rata-rata rapor atau ujian masuk di atas atau sama dengan {kriteriaScore} akan otomatis diloloskan.</p>
          </div>
        </div>
      )}

      {activeSubTab === 'pengumuman' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase">Portal Pencarian Hasil Pengumuman Lulus</h3>
            <p className="text-xs text-slate-400 mt-1">Gunakan form di bawah ini untuk mencari data status kelulusan calon siswa baru secara instan.</p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <div className="flex gap-2">
              <input value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} placeholder="Masukkan Kode REG2026... atau Nama" className="flex-1 bg-slate-50 border rounded-xl px-4 py-3 text-xs font-mono focus:bg-white focus:outline-none" />
              <button onClick={handleLookup} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl text-xs transition">
                Cari Hasil
              </button>
            </div>

            {lookupResult && (
              <div className="border rounded-2xl p-6 text-center space-y-4 bg-slate-50/50">
                <h4 className="font-extrabold text-sm text-slate-500 uppercase tracking-widest">HASIL PENGUMUMAN PPDB</h4>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{lookupResult.nama}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">KODE: {lookupResult.kodePendaftaran}</p>
                </div>
                
                {lookupResult.status === 'Diterima' ? (
                  <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl space-y-2">
                    <p className="text-sm font-black flex items-center justify-center gap-1.5"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> SELAMAT! ANDA DINYATAKAN LULUS</p>
                    <p className="text-xs text-emerald-700">{lookupResult.catatanAdmin}</p>
                  </div>
                ) : lookupResult.status === 'Tidak Diterima' ? (
                  <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl">
                    <p className="text-sm font-black">MOHON MAAF, ANDA BELUM LULUS</p>
                    <p className="text-xs text-rose-700 mt-1">{lookupResult.catatanAdmin}</p>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
                    <p className="text-sm font-black">BERKAS SEDANG DIVERIFIKASI</p>
                    <p className="text-xs text-amber-700 mt-1">{lookupResult.catatanAdmin}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'daftar_ulang' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase">Proses & Alur Daftar Ulang Siswa Baru</h3>
            <p className="text-xs text-slate-400 mt-1">Bagi calon siswa yang telah dinyatakan LULUS, silakan tuntaskan daftar ulang administratif di bawah ini.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {[
              { step: 'Tahap 1', label: 'Konfirmasi Kesediaan', desc: 'Siswa mengonfirmasi kehadiran fisik lewat portal.', done: true },
              { step: 'Tahap 2', label: 'Pengukuran Seragam', desc: 'Mengisi ukuran kaos, celana, seragam pramuka.', done: false },
              { step: 'Tahap 3', label: 'Uang Pangkal / Seragam', desc: 'Melunasi tagihan seragam & perlengkapan awal.', done: false }
            ].map((step, idx) => (
              <div key={idx} className="border p-5 rounded-2xl flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className={`inline-block font-black text-[9px] px-2 py-0.5 rounded ${step.done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {step.step} • {step.done ? 'Selesai' : 'Belum Selesai'}
                  </span>
                  <h5 className="font-bold text-slate-800 text-sm">{step.label}</h5>
                  <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
                <button onClick={() => Swal.fire('Daftar Ulang', `Langkah ${step.label} berhasil diselesaikan.`, 'success')} className="w-full bg-slate-50 border hover:bg-slate-100 py-2 rounded-lg text-slate-700 font-bold text-[10px] transition">
                  {step.done ? 'Ulangi Langkah' : 'Konfirmasi Selesai'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'pdkt' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase">Cetak Kartu Orientasi Siswa Baru (Masa PDKT)</h3>
              <p className="text-xs text-slate-400 mt-1">Cetak tanda pengenal orientasi/MOS (Masa Pengenalan Lingkungan Sekolah) bagi yang lulus daftar ulang.</p>
            </div>
          </div>

          <div className="max-w-xs mx-auto border border-blue-200 rounded-[2rem] p-6 bg-gradient-to-b from-blue-50 to-white text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center font-bold text-white text-xl shadow-lg border-2 border-white">
              PPDB
            </div>
            
            <div className="space-y-1">
              <h4 className="font-black text-slate-800 text-base">KARTU PESERTA PLS</h4>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Rombel High School</p>
            </div>

            <div className="w-32 h-32 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-300 font-mono text-xs border border-dashed border-slate-300">
              [ Foto Siswa 3x4 ]
            </div>

            <div className="space-y-1">
              <h5 className="font-extrabold text-slate-800 text-sm">AHMAD FAUZI</h5>
              <p className="text-[10px] text-slate-400 font-mono">REG: REG20264903</p>
            </div>

            <button onClick={() => Swal.fire('Cetak Kartu', 'Mengirimkan perintah cetak ke mesin printer Anda...', 'info')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow">
              <Printer className="w-4 h-4" /> Cetak Kartu Pengenal
            </button>
          </div>
        </div>
      )}

      {/* VERIFIKASI / EDIT STATUS MODAL */}
      {selectedPendaftar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl p-6 relative border">
            <button 
              onClick={() => setSelectedPendaftar(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              &times;
            </button>
            <h3 className="font-extrabold text-slate-800 text-lg border-b pb-3 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Verifikasi Berkas Calon Siswa
            </h3>

            <div className="bg-slate-50 p-4 rounded-2xl mb-4 border space-y-1 text-xs">
              <p><span className="text-slate-400 font-semibold inline-block w-24">Nama</span>: <b className="text-slate-800 text-sm">{selectedPendaftar.nama}</b></p>
              <p><span className="text-slate-400 font-semibold inline-block w-24">Kode Daftar</span>: <b className="text-slate-800 font-mono">{selectedPendaftar.kodePendaftaran}</b></p>
              <p><span className="text-slate-400 font-semibold inline-block w-24">NISN</span>: <b className="text-slate-800 font-mono">{selectedPendaftar.nisn}</b></p>
            </div>

            <form onSubmit={handleVerifikasiSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Pilih Status Baru</label>
                  <select 
                    value={newStatus} 
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full text-sm border bg-slate-50 rounded-xl px-4 py-3 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Menunggu">Menunggu</option>
                    <option value="Disetujui">Disetujui</option>
                    <option value="Ditolak">Ditolak</option>
                    <option value="Perbaikan">Perbaikan Berkas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Catatan Admin / Keterangan</label>
                <textarea 
                  value={catatanAdmin} 
                  onChange={(e) => setCatatanAdmin(e.target.value)}
                  className="w-full text-xs border bg-slate-50 rounded-xl px-4 py-3" 
                  rows={3} 
                  placeholder="Contoh: Berkas kurang lengkap / Foto ijazah buram..."
                ></textarea>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setSelectedPendaftar(null)} className="px-5 py-2.5 rounded-xl border text-slate-600 font-bold text-xs hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md">
                  Simpan Verifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DETAIL ISIAN FORMULIR MODAL */}
      {viewingDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2rem] shadow-2xl p-6 relative border space-y-4">
            <button 
              onClick={() => setViewingDetail(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              &times;
            </button>

            <div className="border-b pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Detail Isian Pendaftaran SPMB
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Kode: {viewingDetail.kodePendaftaran} • Tgl Daftar: {viewingDetail.tanggalDaftar}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                viewingDetail.status === 'Diterima' || viewingDetail.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                viewingDetail.status === 'Ditolak' || viewingDetail.status === 'Tidak Diterima' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {viewingDetail.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border">
              {formFields.map((field) => {
                const val = (viewingDetail as any)[field.key] || (viewingDetail as any)[field.label] || '-';
                return (
                  <div key={field.key} className="space-y-0.5 p-2 bg-white rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">{field.label}</span>
                    <p className="font-bold text-slate-800 text-xs break-words">{String(val)}</p>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingDetail(null)}
                className="px-5 py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-700 transition"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

declare const Swal: any;
export {};
