import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, CheckCircle2, XCircle, Search, Filter, Plus, RefreshCw, 
  Trash2, Edit3, Shield, Clock, Send, Sparkles, Check, Database, ExternalLink 
} from 'lucide-react';
import Swal from 'sweetalert2';
import { db } from '../data/db';
import { useStore } from '../store';
import { fetchFromGAS } from '../lib/api';

export default function SuaraKomunitasManager() {
  const { settings } = useStore();
  const scriptUrl = settings?.scriptUrl || '';

  const [suaraList, setSuaraList] = useState<any[]>(() => {
    return db.get<any>('suara_komunitas') || [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Sync state to in-memory DB
  useEffect(() => {
    db.set('suara_komunitas', suaraList);
  }, [suaraList]);

  // Load from Google Sheets on mount if scriptUrl exists
  const loadFromSheet = async () => {
    if (!scriptUrl) return;
    setIsLoading(true);
    setSyncStatusMsg("⏳ Menghubungkan ke Google Sheets (Sheet: SUARA_KOMUNITAS)...");
    try {
      const res = await fetchFromGAS(scriptUrl, { action: 'GET_SHEET', sheetName: 'SUARA_KOMUNITAS' });
      if (res && res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        setSuaraList(res.data);
        db.set('suara_komunitas', res.data);
        setSyncStatusMsg(`✅ Sukses memuat ${res.data.length} data dari Google Spreadsheet.`);
      } else {
        setSyncStatusMsg("ℹ️ Sheet SUARA_KOMUNITAS di-load (Data dari penyimpanan lokal aktif).");
      }
    } catch (err: any) {
      console.warn("Error load SUARA_KOMUNITAS sheet:", err);
      setSyncStatusMsg("⚠️ Gagal terhubung ke Google Sheet. Menampilkan data lokal.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFromSheet();
  }, [scriptUrl]);

  const filteredData = useMemo(() => {
    return suaraList.filter(item => {
      const matchSearch = !searchTerm || 
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.peran?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.teks?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = filterStatus === 'ALL' || (filterStatus === 'PENDING' ? item.status === 'PENDING' : item.status === 'APPROVED' || !item.status);
      return matchSearch && matchStatus;
    });
  }, [suaraList, searchTerm, filterStatus]);

  const pendingCount = useMemo(() => suaraList.filter(s => s.status === 'PENDING').length, [suaraList]);
  const approvedCount = useMemo(() => suaraList.filter(s => s.status === 'APPROVED' || !s.status).length, [suaraList]);

  // Handlers
  const handleApprove = async (id: any) => {
    const updated = suaraList.map(s => s.id === id ? { ...s, status: 'APPROVED' } : s);
    setSuaraList(updated);

    if (scriptUrl) {
      try {
        await fetchFromGAS(scriptUrl, {
          action: 'UPDATE',
          sheetName: 'SUARA_KOMUNITAS',
          idKey: 'id',
          idValue: id,
          recordData: { status: 'APPROVED' }
        });
      } catch (e) {
        console.error("Gagal update sheet:", e);
      }
    }

    Swal.fire('Disetujui!', 'Suara komunitas telah disetujui dan diperbarui di Google Spreadsheet.', 'success');
  };

  const handleReject = async (id: any) => {
    Swal.fire({
      title: 'Hapus Suara Komunitas?',
      text: 'Data ini akan dihapus dari antrean dan Google Spreadsheet.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const updated = suaraList.filter(s => s.id !== id);
        setSuaraList(updated);

        if (scriptUrl) {
          try {
            await fetchFromGAS(scriptUrl, {
              action: 'DELETE',
              sheetName: 'SUARA_KOMUNITAS',
              idKey: 'id',
              idValue: id
            });
          } catch (e) {
            console.error("Gagal hapus dari sheet:", e);
          }
        }

        Swal.fire('Dihapus!', 'Suara komunitas telah dihapus.', 'info');
      }
    });
  };

  const handleTambahManual = () => {
    Swal.fire({
      title: '💬 Tambah Suara Komunitas (Super Admin)',
      html: `
        <div style="text-align: left; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Nama Pengirim:</div>
        <input id="swal-nama" class="swal2-input" style="margin: 0 0 12px 0; width: 100%; font-size: 13px;" placeholder="Contoh: Ibu Hj. Mariah" />

        <div style="text-align: left; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Peran / Jabatan / Komunitas:</div>
        <input id="swal-peran" class="swal2-input" style="margin: 0 0 12px 0; width: 100%; font-size: 13px;" placeholder="Contoh: Orang Tua Siswa / Tokoh Masyarakat Tambora" />

        <div style="text-align: left; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Pesan / Testimoni / Harapan:</div>
        <textarea id="swal-teks" class="swal2-textarea" style="margin: 0 0 12px 0; width: 100%; font-size: 13px; height: 90px;" placeholder="Tuliskan testimoni atau masukan..."></textarea>

        <div style="text-align: left; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Status Publikasi:</div>
        <select id="swal-status" class="swal2-input" style="margin: 0; width: 100%; font-size: 13px;">
          <option value="APPROVED">APPROVED (Langsung Tayang Publik)</option>
          <option value="PENDING">PENDING (Menunggu Moderasi)</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: '💾 Simpan ke Sheet SUARA_KOMUNITAS',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#1e1b4b',
      preConfirm: () => {
        const nama = (document.getElementById('swal-nama') as HTMLInputElement)?.value;
        const peran = (document.getElementById('swal-peran') as HTMLInputElement)?.value;
        const teks = (document.getElementById('swal-teks') as HTMLTextAreaElement)?.value;
        const status = (document.getElementById('swal-status') as HTMLSelectElement)?.value;

        if (!nama || !teks) {
          Swal.showValidationMessage('Nama pengirim dan isi pesan wajib diisi!');
          return false;
        }
        return { nama, peran: peran || 'Masyarakat Umum', teks, status };
      }
    }).then(async (res: any) => {
      if (res.isConfirmed && res.value) {
        const newItem = {
          id: 'SUARA-' + Date.now(),
          nama: res.value.nama,
          peran: res.value.peran,
          teks: res.value.teks,
          status: res.value.status,
          tanggal: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        };

        setSuaraList(prev => [newItem, ...prev]);

        if (scriptUrl) {
          try {
            await fetchFromGAS(scriptUrl, {
              action: 'SAVE_SUARA_KOMUNITAS',
              sheetName: 'SUARA_KOMUNITAS',
              recordData: newItem
            });
          } catch (err) {
            console.error("Gagal simpan ke sheet:", err);
          }
        }

        Swal.fire('Berhasil!', 'Suara komunitas telah disimpan ke Sheet SUARA_KOMUNITAS.', 'success');
      }
    });
  };

  const handleEdit = (item: any) => {
    Swal.fire({
      title: '✏️ Edit Suara Komunitas',
      html: `
        <div style="text-align: left; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Nama Pengirim:</div>
        <input id="swal-edit-nama" class="swal2-input" style="margin: 0 0 12px 0; width: 100%; font-size: 13px;" value="${item.nama || ''}" />

        <div style="text-align: left; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Peran / Status:</div>
        <input id="swal-edit-peran" class="swal2-input" style="margin: 0 0 12px 0; width: 100%; font-size: 13px;" value="${item.peran || ''}" />

        <div style="text-align: left; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Pesan / Testimoni:</div>
        <textarea id="swal-edit-teks" class="swal2-textarea" style="margin: 0 0 12px 0; width: 100%; font-size: 13px; height: 90px;">${item.teks || ''}</textarea>

        <div style="text-align: left; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Status Publikasi:</div>
        <select id="swal-edit-status" class="swal2-input" style="margin: 0; width: 100%; font-size: 13px;">
          <option value="APPROVED" ${item.status === 'APPROVED' ? 'selected' : ''}>APPROVED (Tayang Publik)</option>
          <option value="PENDING" ${item.status === 'PENDING' ? 'selected' : ''}>PENDING (Menunggu Moderasi)</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: '💾 Update Data',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#1e1b4b',
      preConfirm: () => {
        const nama = (document.getElementById('swal-edit-nama') as HTMLInputElement)?.value;
        const peran = (document.getElementById('swal-edit-peran') as HTMLInputElement)?.value;
        const teks = (document.getElementById('swal-edit-teks') as HTMLTextAreaElement)?.value;
        const status = (document.getElementById('swal-edit-status') as HTMLSelectElement)?.value;

        return { nama, peran, teks, status };
      }
    }).then(async (res: any) => {
      if (res.isConfirmed && res.value) {
        const updatedItem = { ...item, ...res.value };
        const newList = suaraList.map(s => s.id === item.id ? updatedItem : s);
        setSuaraList(newList);

        if (scriptUrl) {
          try {
            await fetchFromGAS(scriptUrl, {
              action: 'UPDATE',
              sheetName: 'SUARA_KOMUNITAS',
              idKey: 'id',
              idValue: item.id,
              recordData: updatedItem
            });
          } catch (err) {
            console.error("Gagal update sheet:", err);
          }
        }

        Swal.fire('Diperbarui!', 'Data suara komunitas telah diperbarui di Google Spreadsheet.', 'success');
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Ringkasan Dashboard Super Admin */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
              <Shield size={14} className="text-amber-400" />
              Portal Super Admin & Moderator
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <MessageSquare className="text-amber-400" />
              Kelola & Moderasi Suara Komunitas
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pusat kelola masukan, harapan, dan testimoni masyarakat, orang tua siswa, dan alumni Rombel KTCT Tambora. Terintegrasi penuh ke Google Spreadsheet (Sheet: <strong className="text-amber-300 font-mono">SUARA_KOMUNITAS</strong>).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={handleTambahManual}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-amber-500/20 transition"
            >
              <Plus size={16} />
              + Tambah Testimoni Baru
            </button>
            <button
              onClick={loadFromSheet}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold border border-white/15 transition disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Sync Google Sheet
            </button>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="mt-4 p-3 rounded-2xl text-xs font-bold bg-white/10 border border-white/15 text-slate-200 flex items-center gap-2">
            <span>{syncStatusMsg}</span>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <MessageSquare size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Suara</span>
            <span className="text-2xl font-black text-slate-900">{suaraList.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">Menunggu Konfirmasi (Pending)</span>
            <span className="text-2xl font-black text-amber-700">{pendingCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">Disetujui / Tayang Publik</span>
            <span className="text-2xl font-black text-emerald-700">{approvedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama, peran, atau isi testimoni..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter size={14} /> Filter Status:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Semua ({suaraList.length})
              </button>
              <button
                onClick={() => setFilterStatus('PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === 'PENDING' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-amber-700'}`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setFilterStatus('APPROVED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === 'APPROVED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'}`}
              >
                Tayang ({approvedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Tabel Data Suara Komunitas */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                <th className="p-3.5 pl-4">ID & Tanggal</th>
                <th className="p-3.5">Pengirim & Peran</th>
                <th className="p-3.5">Isi Pesan / Testimoni</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 pr-4 text-center">Aksi Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700 font-medium">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                    Tidak ada data suara komunitas ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isPending = item.status === 'PENDING';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md block w-fit">
                          {item.id}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {item.tanggal || 'Terbaru'}
                        </span>
                      </td>

                      <td className="p-3.5 min-w-[180px]">
                        <span className="font-black text-slate-900 block">{item.nama}</span>
                        <span className="text-[11px] text-amber-700 font-semibold block">{item.peran}</span>
                      </td>

                      <td className="p-3.5 min-w-[280px]">
                        <p className="text-slate-800 leading-relaxed italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/50">
                          "{item.teks}"
                        </p>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black">
                            <Clock size={12} /> PENDING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                            <CheckCircle2 size={12} /> APPROVED
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs transition"
                              title="Setujui & Tayangkan Publik"
                            >
                              <Check size={12} /> Setujui
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                            title="Edit Suara Komunitas"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                            title="Hapus Suara Komunitas"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
