import React, { useState, useEffect } from 'react';
import { db } from '../data/db';
import { useSubTab } from '../utils/subTabHelper';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Upload, 
  Trash2, 
  Download,
  FileCheck,
  Mail,
  Plus,
  Send,
  BookOpen,
  FolderOpen,
  Sparkles
} from 'lucide-react';

export default function Dokumen() {
  const [activeSubTab, setActiveSubTab] = useSubTab<'dashboard' | 'arsip' | 'surat_masuk' | 'surat_keluar' | 'template'>('dokumen', 'dashboard');
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Surat Masuk & Keluar states
  const [suratMasukList, setSuratMasukList] = useState<any[]>([
    { id: 'SM_01', noSurat: '045.2/339/Disdik', asal: 'Dinas Pendidikan Provinsi', perihal: 'Undangan Rapat Koordinasi BOS', tanggal: '2026-07-08', status: 'DITERIMA' },
    { id: 'SM_02', noSurat: '112/K3S/SMA/2026', asal: 'Ketua Musyawarah Kerja Kepala Sekolah', perihal: 'Pemberitahuan Kisi-kisi Evaluasi', tanggal: '2026-07-05', status: 'DITERIMA' }
  ]);

  const [suratKeluarList, setSuratKeluarList] = useState<any[]>([
    { id: 'SK_01', noSurat: '421/089/SMA-SS/2026', penerima: 'Seluruh Wali Murid Kelas X-XII', perihal: 'Surat Edaran Rapor & Libur Semester', tanggal: '2026-06-20', status: 'TERKIRIM' }
  ]);

  useEffect(() => {
    loadDocs();
  }, [activeSubTab]);

  const loadDocs = () => {
    let list = db.get<any>('dokumen');
    if (list.length === 0) {
      list = [
        { id: 'DOC_001', nama: 'SK_Pendirian_Sekolah.pdf', tipe: 'PDF', ukuran: '2.4 MB', tanggal: '2026-01-10', kategori: 'SK & Surat Resmi' },
        { id: 'DOC_002', nama: 'Kurikulum_Merdeka_SMA.docx', tipe: 'DOCX', ukuran: '1.8 MB', tanggal: '2026-02-15', kategori: 'Kurikulum' },
        { id: 'DOC_003', nama: 'Rencana_Anggaran_2026.xlsx', tipe: 'XLSX', ukuran: '3.1 MB', tanggal: '2026-03-01', kategori: 'Keuangan' }
      ];
      db.set('dokumen', list);
    }
    setDocuments(list);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    Swal.fire({
      title: 'Mengunggah...',
      text: `Sedang mengunggah file ${file.name} ke berkas Cloud Drive.`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    setTimeout(() => {
      Swal.close();

      const newDoc = {
        id: `DOC_${Date.now().toString().slice(-4)}`,
        nama: file.name,
        tipe: file.name.split('.').pop()?.toUpperCase() || 'RAW',
        ukuran: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        tanggal: new Date().toISOString().slice(0, 10),
        kategori: 'Arsip Umum'
      };

      db.insert('dokumen', newDoc);
      Swal.fire('Sukses!', 'File berhasil disimpan di arsip digital.', 'success');
      loadDocs();
    }, 1500);
  };

  const handleDeleteDoc = (id: string, name: string) => {
    Swal.fire({
      title: 'Hapus Berkas?',
      text: `Apakah Anda yakin ingin menghapus berkas "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.delete('dokumen', 'id', id);
        Swal.fire('Terhapus!', 'Berkas berhasil dihapus.', 'success');
        loadDocs();
      }
    });
  };

  const filteredDocs = documents.filter(d => 
    d.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {[
          { id: 'dashboard', label: 'Arsip Dashboard' },
          { id: 'arsip', label: 'Arsip Digital' },
          { id: 'surat_masuk', label: 'Surat Masuk' },
          { id: 'surat_keluar', label: 'Surat Keluar' },
          { id: 'template', label: 'Template Surat' }
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-doc-${tab.id}`}
            onClick={() => setActiveSubTab(tab.id as any)}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FolderOpen className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Berkas</span>
                <h4 className="text-xl font-black text-slate-800 mt-1">{documents.length} File</h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Mail className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Surat Masuk</span>
                <h4 className="text-xl font-black text-emerald-600 mt-1">{suratMasukList.length} Surat</h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Send className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Surat Keluar</span>
                <h4 className="text-xl font-black text-amber-500 mt-1">{suratKeluarList.length} Surat</h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><FileText className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Template Surat</span>
                <h4 className="text-xl font-black text-rose-600 mt-1">5 Format</h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="bg-white border p-6 rounded-3xl space-y-4">
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Pemberitahuan Tata Kelola Dokumen</h4>
              <p className="text-slate-500">Sistem tata persuratan Sisko mematuhi standar nomenklatur kearsipan sekolah untuk klasifikasi nomor agenda dinas.</p>
              <div className="p-4 bg-slate-50 border rounded-2xl">
                <p className="font-bold text-slate-700">Penyimpanan Terpakai:</p>
                <p className="text-sm font-black text-blue-600 font-mono mt-1">7.3 MB / 100 MB (Cloud Drive)</p>
              </div>
            </div>

            <div className="bg-white border p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Unggah File Cepat</h4>
                <p className="text-slate-400 mt-1 leading-relaxed">Pindahkan file SK, administrasi, maupun kurikulum ke dalam Cloud Drive sekolah Anda sekarang.</p>
              </div>
              <button onClick={() => setActiveSubTab('arsip')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition">
                Buka Pengunggah Arsip
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'arsip' && (
        <div className="space-y-6">
          {/* Drag & Drop Area */}
          <div 
            className={`border-2 border-dashed rounded-[2rem] p-8 text-center transition ${
              dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              id="file-upload-input" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload-input" className="cursor-pointer space-y-3 block">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800">Tarik & Lepaskan Berkas Anda di Sini</p>
                <p className="text-slate-400 mt-1">Atau klik untuk memilih file dari komputer Anda</p>
              </div>
            </label>
          </div>

          <div className="bg-white border rounded-3xl shadow-sm overflow-hidden text-xs">
            {/* Table */}
            <div className="p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2 w-full md:max-w-xs bg-white border px-3 py-2 rounded-xl">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari arsip digital..." 
                  className="bg-transparent border-none outline-none w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button onClick={loadDocs} className="p-2.5 bg-white border text-slate-600 rounded-xl hover:bg-slate-50 transition">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-4">Nama File</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4 text-center">Ukuran</th>
                    <th className="p-4 text-center">Tanggal</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredDocs.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-bold text-slate-800">{d.nama}</p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{d.tipe}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-blue-600">{d.kategori}</td>
                      <td className="p-4 text-center font-mono">{d.ukuran}</td>
                      <td className="p-4 text-center font-mono text-slate-500">{d.tanggal}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => Swal.fire('Mengunduh', 'Mendownload berkas resmi...', 'success')} className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600"><Download className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteDoc(d.id, d.nama)} className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'surat_masuk' && (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center flex-wrap gap-4 text-xs">
            <h4 className="font-black text-slate-800 text-sm uppercase">Buku Log Registrasi Surat Masuk</h4>
            <button onClick={() => {
              Swal.fire({
                title: 'Registrasi Surat Masuk',
                html: `
                  <input id="swal-sm-no" class="swal2-input" placeholder="No Surat">
                  <input id="swal-sm-asal" class="swal2-input" placeholder="Asal Instansi">
                  <input id="swal-sm-hal" class="swal2-input" placeholder="Perihal">
                `,
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                preConfirm: () => {
                  const no = (document.getElementById('swal-sm-no') as HTMLInputElement).value;
                  const asal = (document.getElementById('swal-sm-asal') as HTMLInputElement).value;
                  const hal = (document.getElementById('swal-sm-hal') as HTMLInputElement).value;
                  if (!no || !asal || !hal) {
                    Swal.showValidationMessage('Seluruh isian wajib!');
                  }
                  return { no, asal, hal };
                }
              }).then((result: any) => {
                if (result.isConfirmed) {
                  const newSm = {
                    id: `SM_${Date.now()}`,
                    noSurat: result.value.no,
                    asal: result.value.asal,
                    perihal: result.value.hal,
                    tanggal: new Date().toISOString().slice(0, 10),
                    status: 'DITERIMA'
                  };
                  setSuratMasukList([newSm, ...suratMasukList]);
                  Swal.fire('Registrasi Berhasil', 'Surat masuk berhasil dicatat.', 'success');
                }
              });
            }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1">
              <Plus className="w-4 h-4" /> Catat Surat Masuk
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">No Agenda / Surat</th>
                  <th className="p-4">Pengirim / Asal</th>
                  <th className="p-4">Perihal Dinas</th>
                  <th className="p-4 text-center">Tanggal Terima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suratMasukList.map((sm) => (
                  <tr key={sm.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-slate-600">{sm.noSurat}</td>
                    <td className="p-4 font-bold text-slate-800 text-sm">{sm.asal}</td>
                    <td className="p-4 font-semibold text-blue-600">{sm.perihal}</td>
                    <td className="p-4 text-center font-mono text-slate-500">{sm.tanggal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'surat_keluar' && (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center flex-wrap gap-4 text-xs">
            <h4 className="font-black text-slate-800 text-sm uppercase">Arsip Persuratan Surat Keluar</h4>
            <button onClick={() => {
              Swal.fire({
                title: 'Catat Surat Keluar',
                html: `
                  <input id="swal-sk-no" class="swal2-input" placeholder="No Surat">
                  <input id="swal-sk-rec" class="swal2-input" placeholder="Penerima">
                  <input id="swal-sk-hal" class="swal2-input" placeholder="Perihal">
                `,
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                preConfirm: () => {
                  const no = (document.getElementById('swal-sk-no') as HTMLInputElement).value;
                  const rec = (document.getElementById('swal-sk-rec') as HTMLInputElement).value;
                  const hal = (document.getElementById('swal-sk-hal') as HTMLInputElement).value;
                  if (!no || !rec || !hal) {
                    Swal.showValidationMessage('Seluruh isian wajib!');
                  }
                  return { no, rec, hal };
                }
              }).then((result: any) => {
                if (result.isConfirmed) {
                  const newSk = {
                    id: `SK_${Date.now()}`,
                    noSurat: result.value.no,
                    penerima: result.value.rec,
                    perihal: result.value.hal,
                    tanggal: new Date().toISOString().slice(0, 10),
                    status: 'TERKIRIM'
                  };
                  setSuratKeluarList([newSk, ...suratKeluarList]);
                  Swal.fire('Catat Berhasil', 'Surat keluar berhasil diarsipkan.', 'success');
                }
              });
            }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1">
              <Plus className="w-4 h-4" /> Catat Surat Keluar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">No Surat</th>
                  <th className="p-4">Tujuan / Penerima</th>
                  <th className="p-4">Perihal Dinas</th>
                  <th className="p-4 text-center">Tanggal Keluar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suratKeluarList.map((sk) => (
                  <tr key={sk.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-slate-600">{sk.noSurat}</td>
                    <td className="p-4 font-bold text-slate-800 text-sm">{sk.penerima}</td>
                    <td className="p-4 font-semibold text-blue-600">{sk.perihal}</td>
                    <td className="p-4 text-center font-mono text-slate-500">{sk.tanggal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'template' && (
        <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase">Blangko & Template Surat Resmi</h3>
            <p className="text-xs text-slate-400 mt-1">Unduh draf atau hasilkan surat secara dinas langsung dari data siswa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
            {[
              { nama: 'Surat Keterangan Aktif Siswa', desc: 'Diterbitkan untuk keperluan tunjangan wali murid atau beasiswa.' },
              { nama: 'Surat Izin Orang Tua', desc: 'Digunakan sebagai syarat perizinan kegiatan ekstrakurikuler luar kota.' },
              { nama: 'Surat Keterangan Berkelakuan Baik', desc: 'Diberikan oleh kepala sekolah untuk pendaftaran jenjang lanjutan.' },
              { nama: 'Format Surat Peringatan (SP)', desc: 'Blangko pemanggilan wali murid bermasalah indisipliner BK.' }
            ].map((t, idx) => (
              <div key={idx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex justify-between items-center hover:border-blue-500 transition-all">
                <div className="space-y-1 max-w-[70%]">
                  <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><FileText className="w-4 h-4 text-blue-500" /> {t.nama}</h5>
                  <p className="text-slate-500 font-medium leading-relaxed">{t.desc}</p>
                </div>
                <button onClick={() => Swal.fire('Draf Diunduh', `Format template "${t.nama}" berhasil dibuat.`, 'success')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] shadow">
                  Gunakan Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

declare const Swal: any;
export {};
