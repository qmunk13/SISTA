import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, X, RotateCcw, ShieldCheck, HelpCircle, CornerDownLeft, ChevronRight } from 'lucide-react';
import { StepNumber, StudentProfile, ChatMessage } from '../types';

interface AIAssistantChatProps {
  currentStep: StepNumber;
  studentData: StudentProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  currentStep,
  studentData,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Assalamu Alaikum! Aditya Karya Mahatva Yodha.\n\nSaya AI Asisten Administratif Rombel Karang Taruna. Saya bertugas memandu Anda melalui 4 tahapan konfirmasi data siswa secara tertib dan berurutan. Ada yang ingin Anda tanyakan mengenai alur atau ketentuan belajar?',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      source: 'system',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested quick prompts per step
  const quickPromptsByStep: Record<StepNumber, string[]> = {
    1: [
      'Kenapa wajib memasukkan No. PDKT, NISN, atau NIK?',
      'Bagaimana jika saya tidak ingat NISN lama?',
      'Apa saja program belajar di Rombel Karang Taruna?',
    ],
    2: [
      'Data apa saja yang perlu saya periksa di Review Biodata Diri?',
      'Alamat domisili saya sudah pindah, bagaimana memperbaruinya?',
      'Apakah nomor WhatsApp wajib aktif?',
    ],
    3: [
      'Bagaimana jika status saya belum bekerja / pelajar penuh?',
      'Apakah data pekerjaan mempengaruhi jadwal belajar?',
      'Saya bekerja shift malam/lembur, apa yang harus diisi?',
    ],
    4: [
      'Mengapa kegiatan belajar wajib 3x seminggu?',
      'Bolehkah mengganti pilihan hari dan jam belajar?',
      'Apa sanksi jika tidak memenuhi kehadiran 3x seminggu?',
    ],
    5: [
      'Bagaimana ketentuan tanda tangan di atas materai Rp10.000?',
      'Bolehkah mengunggah foto surat (JPG/PNG) langsung dari kamera HP?',
      'Bagaimana format rekapitulasi data akhir dikirim ke Google Sheets?',
    ],
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          currentStep,
          studentData,
        }),
      });

      const data = await response.json();
      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply || 'Salam Karang Taruna! Terima kasih atas pertanyaannya.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        source: data.source,
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      console.error('Chat error:', err);
      const fallbackAiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: 'Salam Karang Taruna! Terkait pertanyaan Anda, pastikan Anda menyelesaikan tahapan verifikasi ini secara teliti. Jika ada kendala teknis atau administrasi, silakan hubungi pengurus Rombel Karang Taruna.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        source: 'system',
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      id="ai-assistant-panel"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900/95 backdrop-blur-2xl border-l border-slate-700/80 shadow-2xl flex flex-col transition-all duration-300 animate-slideLeft"
    >
      {/* Header */}
      <div className="bg-slate-950 text-white p-4.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-yellow-500/20 ring-1 ring-yellow-400/40">
            <Bot className="w-5 h-5 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white font-['Outfit',sans-serif]">AI Asisten Karang Taruna</h3>
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
            </div>
            <p className="text-[11px] text-yellow-400 font-bold">
              Administrasi & Tata Tertib Rombel
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          title="Tutup Chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Step Context Pill */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-yellow-300">
        <span className="font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-yellow-400" />
          <span>Konteks: Tahap {currentStep} dari 4</span>
        </span>
        <span className="text-[11px] text-slate-400 font-mono">
          {studentData?.namaLengkap ? studentData.namaLengkap.split(' ')[0] : 'Warga Belajar'}
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0B0F19]/60">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 font-bold ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-yellow-400 text-slate-950 shadow-md font-black'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-lg ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none font-semibold'
                  : 'bg-slate-900 text-slate-200 border border-slate-700/80 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>
              <div
                className={`text-[10px] mt-1.5 text-right ${
                  msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
                {msg.source === 'gemini' && (
                  <span className="ml-1 text-[9px] text-yellow-400 font-black">• AI GEN</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic bg-slate-900 p-3 rounded-2xl border border-slate-700/80 w-40 animate-pulse">
            <Bot className="w-4 h-4 text-yellow-400" />
            <span>Sedang mengetik...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Container */}
      <div className="p-3.5 bg-slate-900 border-t border-slate-800">
        <span className="text-[11px] font-black text-yellow-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span>Pertanyaan Cepat Tahap {currentStep}:</span>
        </span>
        <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
          {quickPromptsByStep[currentStep]?.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="text-left text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-yellow-400/40 p-2.5 rounded-xl transition line-clamp-1 cursor-pointer flex items-center justify-between"
            >
              <span>{prompt}</span>
              <ChevronRight className="w-3 h-3 text-slate-500 shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            id="input-ai-chat"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Tanyakan aturan / tata tertib rombel..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs sm:text-sm font-semibold focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isTyping}
            className="bg-yellow-400 hover:bg-yellow-300 active:scale-95 disabled:opacity-40 text-slate-950 font-black p-3 rounded-xl transition cursor-pointer shadow-lg shadow-yellow-400/20 shrink-0"
            title="Kirim Pesan"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
