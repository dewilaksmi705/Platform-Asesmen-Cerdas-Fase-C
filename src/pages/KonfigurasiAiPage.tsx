import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  AI_PROVIDER_OPTIONS,
  COGNITIVE_LEVELS,
  QUESTION_TYPE_META,
  QUESTION_TYPES,
} from '../data/mockFaseCData';
import { generateAssessmentApi } from '../services/assessmentApi';
import {
  AssessmentDraft,
  TeacherAssessmentRecord,
} from '../types/assessment';

interface ProviderApiKeyLinkMeta {
  buttonLabel: string;
  url: string;
  shortNote: string;
}

const PROVIDER_API_KEY_LINKS: Record<string, ProviderApiKeyLinkMeta> = {
  gemini: {
    buttonLabel: 'Dapatkan API Key Gemini',
    url: 'https://aistudio.google.com/app/apikey',
    shortNote:
      'Masuk dengan akun Google di Google AI Studio, pilih menu API Keys, lalu klik Create API Key.',
  },
  openai: {
    buttonLabel: 'Dapatkan API Key OpenAI',
    url: 'https://platform.openai.com/api-keys',
    shortNote:
      'Masuk ke OpenAI Platform, buka menu API Keys, lalu pilih Create new secret key.',
  },
  anthropic: {
    buttonLabel: 'Dapatkan API Key Claude',
    url: 'https://platform.claude.com/settings/keys',
    shortNote:
      'Masuk ke Console Anthropic Claude, buka menu Settings > API Keys, lalu pilih Create Key.',
  },
};

const QUICK_API_KEY_STEPS = [
  'Login menggunakan akun pribadi pada penyedia AI.',
  'Buka halaman API Key.',
  'Buat API Key baru jika belum memilikinya.',
  'Salin API Key yang dibuat.',
  'Kembali ke ASESMEN CERDAS dan tempelkan pada kolom API Key.',
] as const;

interface KonfigurasiAiPageProps {
  draft: AssessmentDraft | null;
  onBackToBuilder: () => void;
  onQuestionsGenerated: (payload: {
    assessment: TeacherAssessmentRecord;
    teacherToken: string;
  }) => void;
}

export function KonfigurasiAiPage({
  draft,
  onBackToBuilder,
  onQuestionsGenerated,
}: KonfigurasiAiPageProps) {
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    AI_PROVIDER_OPTIONS[0].id
  );
  // API Key hanya disimpan sementara di state sesi aktif, tidak pernah disimpan permanen
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [teacherConfirmed, setTeacherConfirmed] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showFullGuideModal, setShowFullGuideModal] = useState<boolean>(false);

  // Bersihkan API Key dari memori saat meninggalkan halaman ini
  useEffect(() => {
    return () => {
      setApiKey('');
    };
  }, []);

  // Tutup modal panduan dengan tombol Escape tanpa mengganggu isian formulir
  useEffect(() => {
    if (!showFullGuideModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowFullGuideModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFullGuideModal]);

  const selectedProvider = useMemo(() => {
    return (
      AI_PROVIDER_OPTIONS.find((p) => p.id === selectedProviderId) ||
      AI_PROVIDER_OPTIONS[0]
    );
  }, [selectedProviderId]);

  const totalCognitive = useMemo(() => {
    if (!draft) return 0;
    return COGNITIVE_LEVELS.reduce(
      (sum, lvl) => sum + draft.distribusiKognitif[lvl],
      0
    );
  }, [draft]);

  if (!draft || draft.selectedTps.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-navy-900">
            Data Rancangan Asesmen Belum Tersedia
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Silakan pilih kelas, mata pelajaran, dan minimal satu Tujuan
            Pembelajaran pada halaman Buat Asesmen terlebih dahulu.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={onBackToBuilder}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Buat Asesmen</span>
          </button>
        </div>
      </div>
    );
  }

  const trimmedKey = apiKey.trim();
  const canConfirmGeneration =
    trimmedKey.length >= 8 && teacherConfirmed && !isGenerating;

  const handleSubmitConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedKey.length < 8) {
      setFormError(
        'Mohon masukkan API Key pribadi guru terlebih dahulu sebelum melanjutkan.'
      );
      return;
    }
    if (!teacherConfirmed) {
      setFormError(
        'Mohon centang pernyataan konfirmasi guru sebelum memulai proses pembuatan soal.'
      );
      return;
    }

    setFormError(null);
    setIsGenerating(true);

    try {
      const response = await generateAssessmentApi({
        draft,
        providerId: selectedProviderId,
        apiKey: trimmedKey,
      });
      // Hapus API Key dari state segera setelah berhasil
      setApiKey('');
      onQuestionsGenerated(response);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Gagal menghasilkan soal dari penyedia AI. Periksa API Key dan koneksi Anda.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearKey = () => {
    setApiKey('');
    setShowApiKey(false);
    setFormError(null);
  };

  const displayTitle =
    draft.judul.trim() ||
    `Asesmen Sumatif ${draft.mataPelajaranNama} Kelas ${draft.kelas}`;

  return (
    <div className="space-y-6">
      {/* Header halaman */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-toska-600 mb-1">
            Tahap Konfigurasi AI · BYOK (Bring Your Own Key)
          </p>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-navy-900">
            Konfigurasi Penyedia AI dan API Key
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Pilih penyedia AI, masukkan API Key pribadi untuk sesi ini, dan
            konfirmasi sebelum proses pembuatan soal dijalankan. Setelah soal
            terbentuk, Anda akan meninjau dan menyetujui setiap butir sebelum
            diterbitkan.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToBuilder}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold text-navy-900 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ubah Rancangan Asesmen</span>
        </button>
      </div>

      {/* Layout 2 Kolom Responsif */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Form Konfigurasi Penyedia AI & BYOK */}
        <form
          onSubmit={handleSubmitConfiguration}
          className="xl:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6"
        >
          {formError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-red-950"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Pilih Penyedia AI */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-cerulean-600 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-navy-900">
                  1. Pilih Penyedia Layanan AI
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Tentukan penyedia AI yang sesuai dengan API Key pribadi yang
                  Anda miliki.
                </p>
              </div>
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
              role="radiogroup"
              aria-label="Pilih penyedia AI"
            >
              {AI_PROVIDER_OPTIONS.map((provider) => {
                const active = selectedProviderId === provider.id;
                const keyLink = PROVIDER_API_KEY_LINKS[provider.id];
                return (
                  <div
                    key={provider.id}
                    className={`rounded-xl border flex flex-col justify-between transition-colors ${
                      active
                        ? 'bg-sky-50/90 border-cerulean-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={isGenerating}
                      onClick={() => {
                        setSelectedProviderId(provider.id);
                        setFormError(null);
                      }}
                      className="p-4 text-left flex-1 w-full rounded-t-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cerulean-600 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-navy-900">
                          {provider.nama}
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            active
                              ? 'bg-cerulean-600 border-cerulean-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-500 mt-1">
                        {provider.penyedia}
                      </p>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {provider.deskripsi}
                      </p>
                    </button>

                    {keyLink && (
                      <div className="px-4 pb-4 pt-3 border-t border-slate-200/70">
                        <a
                          href={keyLink.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold border transition-colors text-center ${
                            active
                              ? 'bg-white border-cerulean-600/40 text-navy-900 hover:bg-sky-100/70'
                              : 'bg-slate-50 border-slate-200 text-navy-900 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span>{keyLink.buttonLabel}</span>
                          <ExternalLink
                            className="w-3.5 h-3.5 text-cerulean-600 shrink-0"
                            aria-hidden="true"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Panduan Singkat Mendapatkan API Key & Tautan Panduan Lengkap */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cerulean-600 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-navy-900">
                    Panduan Singkat Mendapatkan API Key
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullGuideModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cerulean-600 hover:text-navy-900 underline underline-offset-2 transition-colors self-start sm:self-auto"
                >
                  <span>Lihat Panduan Lengkap</span>
                </button>
              </div>

              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {QUICK_API_KEY_STEPS.map((stepText) => (
                  <li key={stepText}>{stepText}</li>
                ))}
              </ol>

              {/* Peringatan Keamanan API Key */}
              <div
                role="note"
                className="bg-amber-50/90 border border-amber-200 rounded-xl px-3.5 py-3 flex items-start gap-2.5 text-xs text-amber-950 leading-relaxed"
              >
                <AlertTriangle
                  className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p>
                  <span className="font-semibold">Peringatan Keamanan:</span>{' '}
                  API Key merupakan informasi rahasia. Jangan membagikan API
                  Key kepada orang lain. Penggunaan API dapat dikenakan biaya
                  sesuai ketentuan penyedia layanan.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Input API Key Pribadi Guru (BYOK) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-toska-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-navy-900">
                  2. Masukkan API Key Pribadi Guru (BYOK)
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Kunci API untuk penyedia{' '}
                  <strong className="text-navy-900">
                    {selectedProvider.nama}
                  </strong>{' '}
                  hanya dipakai pada proses pembuatan soal ini dan langsung
                  dihapus dari memori.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label
                  htmlFor="byok-api-key"
                  className="text-sm font-semibold text-navy-900"
                >
                  API Key {selectedProvider.nama}
                </label>
                {apiKey.length > 0 && !isGenerating && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus dari sesi</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="byok-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  disabled={isGenerating}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setFormError(null);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={`Masukkan API Key ${selectedProvider.nama} Anda...`}
                  className="w-full pl-4 pr-12 py-2.5 min-h-[46px] rounded-xl border border-slate-300 bg-white font-mono text-sm text-navy-900 placeholder:font-sans placeholder:text-slate-400 focus:border-cerulean-600 disabled:bg-slate-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-slate-100 transition-colors"
                  aria-label={
                    showApiKey ? 'Sembunyikan API Key' : 'Tampilkan API Key'
                  }
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-slate-700 leading-relaxed">
              <Lock className="w-4 h-4 text-toska-600 shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold text-navy-900">
                  Kebijakan Privasi BYOK &amp; Keamanan Kunci Jawaban:
                </span>{' '}
                API Key diproses di server hanya untuk sesi generasi ini dan{' '}
                <span className="font-semibold text-navy-900">
                  tidak pernah disimpan
                </span>{' '}
                di database maupun localStorage. Kunci jawaban seluruh soal yang
                dihasilkan disimpan aman di server dan tidak dikirim ke browser
                murid sebelum asesmen selesai.
              </p>
            </div>
          </div>

          {/* 3. Konfirmasi Guru Sebelum Menjalankan AI */}
          <div className="space-y-4 pt-2">
            <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-toska-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-navy-900">
                  <p className="font-semibold">
                    Konfirmasi Guru Wajib Sebelum Generasi Soal
                  </p>
                  <p className="text-slate-700 mt-0.5 leading-relaxed">
                    AI akan menyusun {draft.jumlahSoal} soal ({draft.distribusiTipeSoal.PG} PG Tunggal,{' '}
                    {draft.distribusiTipeSoal.MCMA} MCMA, dan{' '}
                    {draft.distribusiTipeSoal.KATEGORI} Kategori) yang masing-masing terhubung ke TP terpilih, indikator soal, dan level kognitif C1–C6 sesuai usia murid SD. Anda wajib meninjau dan menyetujui seluruh butir sebelum menerbitkannya.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 pt-2 border-t border-teal-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teacherConfirmed}
                  disabled={isGenerating}
                  onChange={(e) => {
                    setTeacherConfirmed(e.target.checked);
                    setFormError(null);
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-cerulean-600 focus:ring-cerulean-600 shrink-0"
                />
                <span className="text-xs sm:text-sm text-navy-900 leading-relaxed">
                  Saya telah memeriksa seluruh parameter rancangan asesmen dan
                  siap menjalankan pembuatan soal menggunakan{' '}
                  <strong>{selectedProvider.nama}</strong>.
                </span>
              </label>
            </div>
          </div>

          {isGenerating && (
            <div
              role="status"
              aria-live="polite"
              className="bg-sky-50 border border-sky-200 rounded-xl p-5 flex items-start gap-3.5"
            >
              <Loader2 className="w-5 h-5 text-cerulean-600 animate-spin shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-navy-900 space-y-1">
                <p className="font-bold">
                  Sedang Menyusun {draft.jumlahSoal} Butir Soal Berbantuan{' '}
                  {selectedProvider.nama}...
                </p>
                <p className="text-slate-700 leading-relaxed">
                  AI sedang memetakan setiap soal ke Tujuan Pembelajaran,
                  indikator, dan level kognitif C1–C6 untuk{' '}
                  <strong>{draft.mataPelajaranNama}</strong>. Mohon tunggu
                  sejenak tanpa menutup halaman ini.
                </p>
              </div>
            </div>
          )}

          {/* Tombol Aksi Bawah */}
          <div className="pt-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackToBuilder}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-navy-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Buat Asesmen</span>
            </button>

            <button
              type="submit"
              disabled={!canConfirmGeneration}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat Soal dengan AI...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4 text-toska-500" />
                  <span>Konfirmasi &amp; Mulai Buat Soal</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Kolom Kanan: Data Rancangan Asesmen yang Diteruskan */}
        <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 xl:sticky xl:top-24 space-y-5">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-navy-900">
              Data Rancangan yang Diteruskan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh parameter berikut akan dijadikan dasar penyusunan soal AI.
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Judul Asesmen</dt>
              <dd className="font-semibold text-navy-900 mt-0.5">
                {displayTitle}
              </dd>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              <div>
                <dt className="text-xs text-slate-500">Jenjang</dt>
                <dd className="font-semibold text-navy-900 mt-0.5">
                  {draft.jenjang}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Fase</dt>
                <dd className="font-semibold text-navy-900 mt-0.5">
                  Fase {draft.fase}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Kelas Peserta</dt>
                <dd className="font-semibold text-navy-900 mt-0.5">
                  Kelas {draft.kelas}
                </dd>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <dt className="text-xs text-slate-500">Mata Pelajaran</dt>
              <dd className="font-semibold text-navy-900 mt-0.5">
                {draft.mataPelajaranNama}
              </dd>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <dt className="text-xs text-slate-500">Jumlah Soal</dt>
                <dd className="font-mono font-semibold text-navy-900 mt-0.5 tabular-nums">
                  {draft.jumlahSoal} butir
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Durasi</dt>
                <dd className="font-mono font-semibold text-navy-900 mt-0.5 tabular-nums">
                  {draft.durasiMenit} menit
                </dd>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <dt className="text-xs text-slate-500 mb-1.5">
                Komposisi Bentuk Soal
              </dt>
              <dd className="space-y-1.5 text-xs tabular-nums">
                {QUESTION_TYPES.map((t) => (
                  <div
                    key={t}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80"
                  >
                    <span className="text-slate-600 font-medium">
                      {QUESTION_TYPE_META[t].singkatan}
                    </span>
                    <span className="font-mono font-semibold text-navy-900">
                      {draft.distribusiTipeSoal[t]} soal
                    </span>
                  </div>
                ))}
              </dd>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <dt className="text-slate-500">Pengacakan Soal</dt>
              <dd className="font-semibold text-navy-900">
                {draft.acakSoal ? 'Aktif (Diacak)' : 'Berurutan'}
              </dd>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <dt className="text-xs text-slate-500">Distribusi C1 – C6</dt>
                <span className="font-mono text-[11px] font-semibold text-toska-600 tabular-nums">
                  Total {totalCognitive} soal
                </span>
              </div>
              <dd className="grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
                {COGNITIVE_LEVELS.map((lvl) => (
                  <div
                    key={lvl}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80"
                  >
                    <span className="text-slate-500">{lvl}</span>
                    <span className="font-semibold text-navy-900">
                      {draft.distribusiKognitif[lvl]}
                    </span>
                  </div>
                ))}
              </dd>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <dt className="text-xs text-slate-500 mb-2">
                Daftar TP Terpilih ({draft.selectedTps.length})
              </dt>
              <dd className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {draft.selectedTps.map((tp) => (
                  <div
                    key={tp.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center gap-x-1.5 text-slate-500">
                      <span className="font-mono font-semibold text-navy-900">
                        {tp.tp_code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-toska-600 font-medium">
                        {tp.element}
                      </span>
                    </div>
                    <p className="text-navy-900 leading-relaxed">{tp.tp_text}</p>
                    <p className="text-[11px] text-slate-500">
                      Materi: {tp.material_scope}
                    </p>
                  </div>
                ))}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      {/* Modal Panduan Lengkap Penggunaan API Key (BYOK) */}
      {showFullGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/50 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="panduan-api-key-title"
          onClick={() => setShowFullGuideModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-cerulean-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="panduan-api-key-title"
                    className="text-base font-bold text-navy-900 truncate"
                  >
                    Panduan Lengkap Mendapatkan &amp; Menggunakan API Key
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sistem BYOK (Bring Your Own Key) · ASESMEN CERDAS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullGuideModal(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Tutup panduan API Key"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <div className="space-y-1.5">
                <h3 className="font-bold text-navy-900">
                  Apa itu API Key dan BYOK?
                </h3>
                <p>
                  API Key adalah kunci akses pribadi dari penyedia layanan AI
                  (Google Gemini, OpenAI GPT, atau Anthropic Claude) yang
                  menghubungkan ASESMEN CERDAS dengan mesin AI secara langsung
                  atas nama akun guru. Dengan sistem{' '}
                  <strong className="text-navy-900">BYOK</strong>, Anda memiliki
                  kendali penuh atas penyedia AI dan batas pemakaian akun Anda.
                </p>
              </div>

              <div className="space-y-2.5">
                <h3 className="font-bold text-navy-900">
                  Langkah Cepat di Setiap Penyedia AI
                </h3>
                <div className="space-y-2.5">
                  {AI_PROVIDER_OPTIONS.map((provider) => {
                    const keyLink = PROVIDER_API_KEY_LINKS[provider.id];
                    if (!keyLink) return null;
                    return (
                      <div
                        key={provider.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="font-bold text-navy-900">
                            {provider.nama}
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {keyLink.shortNote}
                          </p>
                        </div>
                        <a
                          href={keyLink.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg text-xs font-semibold text-navy-900 bg-white border border-slate-200 hover:bg-sky-50 hover:border-cerulean-600/40 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                        >
                          <span>{keyLink.buttonLabel}</span>
                          <ExternalLink
                            className="w-3.5 h-3.5 text-cerulean-600 shrink-0"
                            aria-hidden="true"
                          />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-navy-900">
                  Urutan Penggunaan di ASESMEN CERDAS
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  {QUICK_API_KEY_STEPS.map((stepText) => (
                    <li key={stepText}>{stepText}</li>
                  ))}
                  <li>
                    Centang pernyataan konfirmasi guru, lalu klik{' '}
                    <strong className="text-navy-900">
                      Konfirmasi &amp; Mulai Buat Soal
                    </strong>
                    .
                  </li>
                </ol>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
                <AlertTriangle
                  className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p>
                  <span className="font-semibold">Keamanan &amp; Biaya:</span>{' '}
                  API Key merupakan informasi rahasia. Jangan membagikan API
                  Key kepada orang lain. Penggunaan API dapat dikenakan biaya
                  sesuai ketentuan penyedia layanan.
                </p>
              </div>

              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-navy-900">
                <Lock
                  className="w-4 h-4 text-toska-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">
                  <span className="font-semibold">Jaminan Privasi BYOK:</span>{' '}
                  API Key hanya digunakan untuk sesi pembuatan asesmen aktif,
                  tidak disimpan ke Supabase, localStorage, maupun
                  sessionStorage, tidak pernah dicatat dalam log, dan tidak
                  pernah dikirim ke browser murid.
                </p>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFullGuideModal(false)}
                className="inline-flex items-center justify-center px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
