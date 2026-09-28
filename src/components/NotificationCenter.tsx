import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Calendar,
  Award,
  Info,
  Send,
  Radio,
} from 'lucide-react';
import { NotificationItem, UserRole } from '../types';
import { StorageService } from '../services/storageService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  userRole?: UserRole;
  onRefresh: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  userRole,
  onRefresh,
}) => {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState<NotificationItem['tipe']>('INFO');
  const [targetRole, setTargetRole] = useState<'ALL' | 'SISWA' | 'ORANG_TUA'>('ALL');
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    StorageService.markNotificationsAsRead();
    onRefresh();
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) return;

    StorageService.addNotification({
      id: 'NOTIF-' + Date.now(),
      judul: broadcastTitle,
      pesan: broadcastMsg,
      tipe: broadcastType,
      waktu: 'Baru saja',
      dibaca: false,
      targetRole: targetRole,
    });

    setBroadcastTitle('');
    setBroadcastMsg('');
    setShowBroadcastForm(false);
    onRefresh();
  };

  const getIcon = (tipe: NotificationItem['tipe']) => {
    switch (tipe) {
      case 'JADWAL':
        return <Calendar className="w-4 h-4 text-purple-400" />;
      case 'PERINGATAN':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'NILAI':
        return <Award className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Pusat Notifikasi & Pengumuman
              </h3>
              <p className="text-xs text-slate-400">
                Pemberitahuan jadwal, pelanggaran CBT, & nilai otomatis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tandai Semua Dibaca</span>
          </button>

          {(userRole === 'ADMIN' || userRole === 'GURU') && (
            <button
              onClick={() => setShowBroadcastForm(!showBroadcastForm)}
              className="flex items-center gap-1.5 text-xs bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold px-3 py-1 rounded-xl shadow transition"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{showBroadcastForm ? 'Tutup Form' : 'Kirim Siaran Baru'}</span>
            </button>
          )}
        </div>

        {/* Broadcast Sender Form (For Admin / Guru) */}
        {showBroadcastForm && (
          <form
            onSubmit={handleSendBroadcast}
            className="p-4 bg-slate-800/80 border-b border-slate-700 space-y-3 text-xs animate-in slide-in-from-top-2"
          >
            <p className="font-bold text-slate-200 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              <span>Kirim Pengumuman Otomatis ke Siswa / Orang Tua</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Judul Pengumuman"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <select
                value={broadcastType}
                onChange={(e) => setBroadcastType(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white"
              >
                <option value="INFO">Informasi Umum</option>
                <option value="JADWAL">Pengingat Jadwal</option>
                <option value="PERINGATAN">Peringatan Ujian</option>
                <option value="NILAI">Pengumuman Nilai</option>
              </select>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white"
              >
                <option value="ALL">Semua Pengguna</option>
                <option value="SISWA">Khusus Siswa</option>
                <option value="ORANG_TUA">Khusus Orang Tua</option>
              </select>
              <textarea
                placeholder="Tuliskan isi pengumuman atau instruksi ujian..."
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                rows={2}
                className="col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowBroadcastForm(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirimkan Sekarang</span>
              </button>
            </div>
          </form>
        )}

        {/* Notifications List */}
        <div className="overflow-y-auto p-4 space-y-2.5 flex-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Bell className="w-10 h-10 mx-auto opacity-40 mb-2" />
              <p className="text-sm font-medium">Belum ada notifikasi baru</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  notif.dibaca
                    ? 'bg-slate-800/40 border-slate-800/80 text-slate-300'
                    : 'bg-indigo-950/40 border-indigo-500/30 text-white shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800/90 shrink-0 mt-0.5">
                    {getIcon(notif.tipe)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm leading-tight truncate">
                        {notif.judul}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {notif.waktu}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">
                      {notif.pesan}
                    </p>
                    {notif.targetRole && notif.targetRole !== 'ALL' && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-800 text-[10px] rounded-lg text-indigo-300 font-semibold">
                        Penerima: {notif.targetRole}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
