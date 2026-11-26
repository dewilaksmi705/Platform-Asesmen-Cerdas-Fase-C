import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  CloudCheck,
  KeyRound,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Shuffle,
} from 'lucide-react';
import { QUESTION_TYPE_META } from '../data/mockFaseCData';
import {
  autosaveStudentAnswersApi,
  startStudentSessionApi,
  submitStudentSessionApi,
} from '../services/assessmentApi';
import {
  ActiveStudentSession,
  AssessmentSubmissionResult,
  KelasFaseC,
  OptionLabel,
  PublicStudentQuestion,
  StatementId,
  StudentAnswerPayload,
  StudentAnswersMap,
} from '../types/assessment';

interface PengerjaanMuridPageProps {
  prefilledCode?: string | null;
  onClearPrefilledCode?: () => void;
}

const AUTOSAVE_STORAGE_PREFIX = 'asesmen_cerdas_student_answers_v1_';

function isQuestionAnswered(
  q: PublicStudentQuestion,
  ans: StudentAnswerPayload | undefined
): boolean {
  if (!ans) return false;
  if (q.type === 'PG') {
    return Boolean(ans.pg);
  }
  if (q.type === 'MCMA') {
    return Array.isArray(ans.mcma) && ans.mcma.length > 0;
  }
  const kat = ans.kategori ?? {};
  return (
    typeof kat.P1 === 'boolean' &&
    typeof kat.P2 === 'boolean' &&
    typeof kat.P3 === 'boolean'
  );
}

function isQuestionPartiallyAnswered(
  q: PublicStudentQuestion,
  ans: StudentAnswerPayload | undefined
): boolean {
  if (!ans || q.type !== 'KATEGORI') return false;
  const kat = ans.kategori ?? {};
  const count = (['P1', 'P2', 'P3'] as StatementId[]).filter(
    (sid) => typeof kat[sid] === 'boolean'
  ).length;
  return count > 0 && count < 3;
}

function formatCountdown(remainingSeconds: number): string {
  const safe = Math.max(0, Math.floor(remainingSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatTimeClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

export function PengerjaanMuridPage({
  prefilledCode,
  onClearPrefilledCode,
}: PengerjaanMuridPageProps) {
  // Form identitas murid
  const [assessmentCode, setAssessmentCode] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentClass, setStudentClass] = useState<KelasFaseC | ''>('');
  const [studentAbsen, setStudentAbsen] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Sesi pengerjaan aktif (soal tanpa kunci jawaban)
  const [session, setSession] = useState<ActiveStudentSession | null>(null);
  const [answers, setAnswers] = useState<StudentAnswersMap>({});
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [autosaveStatus, setAutosaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Konfirmasi & hasil penilaian otomatis dari server
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentSubmissionResult | null>(null);

  const autosaveTimerRef = useRef<number | null>(null);
  const answersRef = useRef<StudentAnswersMap>(answers);
  const hasAutoSubmittedRef = useRef<boolean>(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (prefilledCode) {
      setAssessmentCode(prefilledCode);
      onClearPrefilledCode?.();
    }
  }, [prefilledCode, onClearPrefilledCode]);

  const performSubmit = useCallback(
    async (autoSubmittedByTimeout: boolean) => {
      if (!session || isSubmitting) return;
      setIsSubmitting(true);
      setSubmitError(null);

      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      try {
        const res = await submitStudentSessionApi({
          sessionId: session.sessionId,
          sessionToken: session.sessionToken,
          answers: answersRef.current,
          autoSubmittedByTimeout,
        });
        try {
          window.localStorage.removeItem(
            `${AUTOSAVE_STORAGE_PREFIX}${session.sessionId}`
          );
        } catch {
          // Abaikan kendala storage
        }
        setResult(res.result);
        setShowSubmitConfirm(false);
      } catch (err: unknown) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : 'Gagal mengumpulkan jawaban ke server. Silakan coba lagi.'
        );
        hasAutoSubmittedRef.current = false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [session, isSubmitting]
  );

  // Penghitung mundur durasi asesmen (tersinkron dengan waktu kedaluwarsa server)
  useEffect(() => {
    if (!session || result) return;

    const updateRemaining = () => {
      const expiresMs = new Date(session.expiresAt).getTime();
      const diffSec = Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
      setRemainingSeconds(diffSec);
      if (diffSec === 0 && !hasAutoSubmittedRef.current) {
        hasAutoSubmittedRef.current = true;
        void performSubmit(true);
      }
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [session, result, performSubmit]);

  // Autosave ke localStorage + server (debounced) setiap jawaban berubah
  const scheduleAutosave = useCallback(
    (nextAnswers: StudentAnswersMap) => {
      if (!session || result) return;

      try {
        window.localStorage.setItem(
          `${AUTOSAVE_STORAGE_PREFIX}${session.sessionId}`,
          JSON.stringify(nextAnswers)
        );
      } catch {
        // Storage penuh/dibatasi tetap lanjutkan autosave server
      }

      setAutosaveStatus('saving');
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = window.setTimeout(async () => {
        try {
          const res = await autosaveStudentAnswersApi({
            sessionId: session.sessionId,
            sessionToken: session.sessionToken,
            answers: nextAnswers,
          });
          setLastSavedAt(res.savedAt);
          setAutosaveStatus('saved');
        } catch {
          setAutosaveStatus('error');
        }
      }, 650);
    },
    [session, result]
  );

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const handleStartSession = async (
    e?: React.FormEvent,
    overrideCode?: string
  ) => {
    e?.preventDefault();
    const effectiveCode = (overrideCode ?? assessmentCode).trim().toUpperCase();
    const effectiveName =
      studentName.trim() || (overrideCode ? 'Peserta Simulasi' : '');
    const effectiveClass: KelasFaseC | null =
      studentClass === 5 || studentClass === 6
        ? studentClass
        : overrideCode
        ? 5
        : null;

    if (!effectiveCode || !effectiveName || !effectiveClass) {
      setJoinError(
        'Mohon isi Kode Asesmen, Nama Lengkap, dan pilih Kelas 5 atau Kelas 6.'
      );
      return;
    }

    setJoinError(null);
    setIsJoining(true);
    hasAutoSubmittedRef.current = false;

    try {
      const res = await startStudentSessionApi({
        assessmentCode: effectiveCode,
        studentName: effectiveName,
        studentClass: effectiveClass,
        studentAbsen: studentAbsen.trim(),
      });
      setSession(res.session);
      setAnswers(res.session.savedAnswers ?? {});
      setActiveIndex(0);
      setResult(null);
      setShowSubmitConfirm(false);
      setSubmitError(null);
      setAutosaveStatus('idle');
      setLastSavedAt(res.session.lastSavedAt);
    } catch (err: unknown) {
      setJoinError(
        err instanceof Error
          ? err.message
          : 'Gagal memulai sesi asesmen. Periksa kode asesmen.'
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handlePgSelect = (questionId: string, option: OptionLabel) => {
    setAnswers((prev) => {
      const next: StudentAnswersMap = {
        ...prev,
        [questionId]: { pg: option },
      };
      scheduleAutosave(next);
      return next;
    });
  };

  const handleMcmaToggle = (questionId: string, option: OptionLabel) => {
    setAnswers((prev) => {
      const current = new Set(prev[questionId]?.mcma ?? []);
      if (current.has(option)) {
        current.delete(option);
      } else {
        current.add(option);
      }
      const next: StudentAnswersMap = {
        ...prev,
        [questionId]: { mcma: Array.from(current).sort() },
      };
      scheduleAutosave(next);
      return next;
    });
  };

  const handleKategoriSelect = (
    questionId: string,
    statementId: StatementId,
    val: boolean
  ) => {
    setAnswers((prev) => {
      const currentKat = prev[questionId]?.kategori ?? {};
      const next: StudentAnswersMap = {
        ...prev,
        [questionId]: {
          kategori: {
            ...currentKat,
            [statementId]: val,
          },
        },
      };
      scheduleAutosave(next);
      return next;
    });
  };

  const handleResetToJoin = () => {
    setSession(null);
    setResult(null);
    setAnswers({});
    setActiveIndex(0);
    setShowSubmitConfirm(false);
    setSubmitError(null);
    setAutosaveStatus('idle');
    setLastSavedAt(null);
  };

  const answeredCount = useMemo(() => {
    if (!session) return 0;
    return session.questions.filter((q) => isQuestionAnswered(q, answers[q.id]))
      .length;
  }, [session, answers]);

  // =========================================================================
  // TAMPILAN 3: HASIL PENILAIAN OTOMATIS TRANSPARAN (SETELAH SELESAI)
  // =========================================================================
  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-toska-600 mb-1">
              Asesmen Selesai · Penilaian Otomatis Server
            </p>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-navy-900">
              Hasil Asesmen: {result.judul}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {result.studentName} · Kelas {result.studentClass}
              {result.studentAbsen ? ` · No. Absen ${result.studentAbsen}` : ''}{' '}
              · {result.mataPelajaranNama}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetToJoin}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold text-navy-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Kerjakan Asesmen Lain</span>
          </button>
        </div>

        {result.autoSubmittedByTimeout && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs sm:text-sm text-amber-950">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Durasi pengerjaan telah habis. Seluruh jawaban tersimpan otomatis
              Anda langsung dikumpulkan dan dinilai oleh server.
            </span>
          </div>
        )}

        {/* Kartu Ringkasan Skor Transparan */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pb-6 border-b border-slate-200">
            <div>
              <p className="text-xs font-medium text-slate-500">Nilai Akhir</p>
              <p className="mt-1 font-mono text-4xl sm:text-5xl font-bold text-navy-900 tabular-nums">
                {result.nilaiAkhir}
                <span className="text-lg font-medium text-slate-400">
                  {' '}
                  / 100
                </span>
              </p>
              <p className="mt-1.5 text-xs text-slate-600 font-mono tabular-nums">
                Total poin: {result.totalSkorDiperoleh} /{' '}
                {result.totalSkorMaksimal} poin
              </p>
            </div>

            <div className="md:col-span-2 bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-navy-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-toska-600 shrink-0" />
                <span>Aturan Penilaian Otomatis yang Transparan</span>
              </p>
              <ul className="space-y-1 leading-relaxed list-disc pl-4">
                <li>
                  <strong>PG Tunggal:</strong> 1 poin penuh bila memilih satu
                  kunci jawaban yang tepat.
                </li>
                <li>
                  <strong>MCMA:</strong> 1 poin penuh bila memilih seluruh
                  pilihan benar tanpa pilihan salah (tanpa pengurangan nilai
                  tersembunyi).
                </li>
                <li>
                  <strong>Kategori (Benar/Salah):</strong> dinilai berdasarkan
                  ketepatan tiap pernyataan (masing-masing 1/3 poin dari 3
                  pernyataan).
                </li>
              </ul>
            </div>
          </div>

          {/* Ringkasan per Tipe Soal & per TP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <h2 className="text-sm font-bold text-navy-900">
                Capaian per Bentuk Soal
              </h2>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden text-xs sm:text-sm">
                {result.ringkasanTipe.map((item) => (
                  <div
                    key={item.type}
                    className="px-4 py-3 bg-white flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-navy-900">
                        {QUESTION_TYPE_META[item.type].nama}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {item.jumlahSoal} soal
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <p className="font-bold text-navy-900">
                        {item.persentase}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.skorDiperoleh} / {item.skorMaksimal} poin
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-sm font-bold text-navy-900">
                Capaian per Tujuan Pembelajaran (TP)
              </h2>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden text-xs sm:text-sm">
                {result.ringkasanTp.map((tp) => (
                  <div
                    key={`${tp.tpCode}-${tp.tpGrade}`}
                    className="px-4 py-3 bg-white flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-mono font-semibold text-navy-900">
                        {tp.tpCode}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        Asal TP: Kelas {tp.tpGrade} · {tp.jumlahSoal} soal
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <p className="font-bold text-navy-900">
                        {tp.persentase}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {tp.skorDiperoleh} / {tp.skorMaksimal} poin
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pembahasan & Kunci Jawaban Resmi (Baru Dibuka Server Setelah Selesai) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-navy-900">
                Rincian Jawaban, Kunci Resmi &amp; Pembahasan
              </h2>
              <p className="text-xs text-slate-500">
                Kunci jawaban resmi baru dikirimkan dari server setelah asesmen
                selesai dikumpulkan.
              </p>
            </div>
          </div>

          {result.rincianSoal.map((item) => {
            const statusText =
              item.statusJawaban === 'benar'
                ? 'Tepat (Skor Penuh)'
                : item.statusJawaban === 'sebagian'
                ? 'Sebagian Tepat'
                : item.statusJawaban === 'kosong'
                ? 'Tidak Dijawab'
                : 'Belum Tepat';
            const statusColor =
              item.statusJawaban === 'benar'
                ? 'text-toska-600'
                : item.statusJawaban === 'sebagian'
                ? 'text-cerulean-600'
                : 'text-red-700';

            return (
              <article
                key={item.questionId}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 text-xs">
                  <div className="flex flex-wrap items-center gap-x-2 text-slate-600">
                    <span className="font-mono font-bold text-navy-900 tabular-nums">
                      Soal #{item.nomorUrut}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-cerulean-600">
                      {QUESTION_TYPE_META[item.type].singkatan}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{item.cognitiveLevel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-toska-600">
                      {item.tpCode} (Kelas {item.tpGrade})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className={`font-semibold ${statusColor}`}>
                      {statusText}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      |
                    </span>
                    <span className="font-bold text-navy-900">
                      {item.skorDiperoleh} / {item.skorMaksimal} poin
                    </span>
                  </div>
                </div>

                {item.stimulus && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-sm text-slate-800 leading-relaxed">
                    {item.stimulus}
                  </div>
                )}

                <p className="text-sm font-semibold text-navy-900 leading-relaxed">
                  {item.pertanyaan}
                </p>

                {(item.type === 'PG' || item.type === 'MCMA') && item.opsi && (
                  <ul className="space-y-1.5 text-xs sm:text-sm">
                    {item.opsi.map((opt) => {
                      const isKey =
                        item.type === 'PG'
                          ? item.kunciPg === opt.label
                          : (item.kunciMcma ?? []).includes(opt.label);
                      const isChosen =
                        item.type === 'PG'
                          ? item.jawabanMurid.pg === opt.label
                          : (item.jawabanMurid.mcma ?? []).includes(opt.label);

                      return (
                        <li
                          key={opt.label}
                          className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl border ${
                            isKey
                              ? 'bg-teal-50/80 border-teal-200 text-navy-900'
                              : isChosen
                              ? 'bg-red-50/80 border-red-200 text-red-950'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span>
                            <strong className="font-mono mr-1.5">
                              {opt.label}.
                            </strong>
                            {opt.teks}
                          </span>
                          <span className="text-[11px] font-semibold whitespace-nowrap">
                            {isChosen && isKey
                              ? 'Dipilih · Kunci Benar'
                              : isKey
                              ? 'Kunci Benar'
                              : isChosen
                              ? 'Dipilih Murid'
                              : ''}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {item.type === 'KATEGORI' && item.pernyataan && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 text-xs sm:text-sm">
                    {item.pernyataan.map((stmt) => (
                      <div
                        key={stmt.id}
                        className={`px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          stmt.benar ? 'bg-teal-50/50' : 'bg-red-50/40'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-mono font-bold text-slate-500">
                            {stmt.id}
                          </span>
                          <span className="text-navy-900">{stmt.teks}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs whitespace-nowrap shrink-0">
                          <span className="text-slate-600">
                            Murid:{' '}
                            <strong className="text-navy-900">
                              {stmt.jawabanMurid === null
                                ? 'Kosong'
                                : stmt.jawabanMurid
                                ? 'Benar'
                                : 'Salah'}
                            </strong>
                          </span>
                          <span className="text-slate-600">
                            Kunci:{' '}
                            <strong className="text-toska-600">
                              {stmt.kunciJawaban ? 'Benar' : 'Salah'}
                            </strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <p className="font-medium text-navy-900">
                    {item.keteranganPenilaian}
                  </p>
                  <p className="leading-relaxed">
                    <strong>Pembahasan:</strong> {item.pembahasan}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN 2: RUANG PENGERJAAN MURID (PG RADIO, MCMA CHECKBOX, KATEGORI B/S)
  // =========================================================================
  if (session) {
    const activeQuestion = session.questions[activeIndex];
    const currentAnswer = activeQuestion ? answers[activeQuestion.id] : undefined;
    const isLowTime = remainingSeconds <= 300;
    const unansweredCount = session.questions.length - answeredCount;

    return (
      <div className="space-y-5">
        {/* Bilah atas informasi ujian & timer */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-toska-600">
              {session.mataPelajaranNama} · SD Fase C · {session.studentName}{' '}
              (Kelas {session.studentClass})
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-navy-900 truncate mt-0.5">
              {session.judul}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
              <span className="tabular-nums">
                Terjawab:{' '}
                <strong className="text-navy-900">
                  {answeredCount} / {session.questions.length}
                </strong>
              </span>
              {session.acakSoal && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Shuffle className="w-3 h-3 text-cerulean-600" />
                    Urutan soal diacak
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                {autosaveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-cerulean-600" />
                    <span>Menyimpan otomatis...</span>
                  </>
                ) : autosaveStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>Tersimpan di perangkat (mencoba sinkron...)</span>
                  </>
                ) : lastSavedAt ? (
                  <>
                    <CloudCheck className="w-3.5 h-3.5 text-toska-600" />
                    <span>Tersimpan otomatis {formatTimeClock(lastSavedAt)}</span>
                  </>
                ) : (
                  <>
                    <CloudCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Autosave aktif</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div
            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 shrink-0 self-start md:self-center ${
              isLowTime
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-sky-50/80 border-sky-200 text-navy-900'
            }`}
            aria-live="polite"
          >
            <Clock
              className={`w-4 h-4 shrink-0 ${
                isLowTime ? 'text-red-600' : 'text-cerulean-600'
              }`}
            />
            <div>
              <span className="block text-[11px] leading-none opacity-80">
                Sisa Waktu
              </span>
              <span className="font-mono text-lg font-bold tabular-nums leading-tight">
                {formatCountdown(remainingSeconds)}
              </span>
            </div>
          </div>
        </section>

        {submitError && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-red-950"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Layout 2 Kolom: Soal Utama + Navigasi Nomor */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Area Soal */}
          {activeQuestion && (
            <div className="xl:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-600">
                  <span className="font-mono font-bold text-sm text-navy-900 tabular-nums">
                    Soal {activeQuestion.nomorUrut} dari{' '}
                    {session.questions.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-cerulean-600">
                    {QUESTION_TYPE_META[activeQuestion.type].nama}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {activeQuestion.tpCode}
                </span>
              </div>

              {/* Stimulus Bacaan */}
              {activeQuestion.stimulus && (
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 sm:p-5 text-sm sm:text-[15px] text-slate-800 leading-relaxed">
                  {activeQuestion.stimulus}
                </div>
              )}

              {/* Pertanyaan */}
              <div className="space-y-1.5">
                <h2 className="text-base sm:text-lg font-bold text-navy-900 leading-relaxed">
                  {activeQuestion.pertanyaan}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeQuestion.type === 'PG'
                    ? 'Pilih tepat satu jawaban yang paling benar.'
                    : activeQuestion.type === 'MCMA'
                    ? 'Pilih semua jawaban yang benar (dapat memilih lebih dari satu pilihan).'
                    : 'Tentukan Benar atau Salah untuk masing-masing dari ketiga pernyataan berikut.'}
                </p>
              </div>

              {/* INPUT 1: PILIHAN GANDA TUNGGAL (RADIO BUTTON) */}
              {activeQuestion.type === 'PG' && activeQuestion.opsi && (
                <fieldset className="space-y-3">
                  <legend className="sr-only">
                    Pilihan jawaban soal nomor {activeQuestion.nomorUrut}
                  </legend>
                  {activeQuestion.opsi.map((opt) => {
                    const checked = currentAnswer?.pg === opt.label;
                    return (
                      <label
                        key={opt.label}
                        className={`flex items-start gap-3.5 p-4 min-h-[54px] rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-sky-50/90 border-cerulean-600 text-navy-900'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`pg-${activeQuestion.id}`}
                          value={opt.label}
                          checked={checked}
                          onChange={() =>
                            handlePgSelect(activeQuestion.id, opt.label)
                          }
                          className="mt-1 w-4 h-4 text-cerulean-600 border-slate-300 focus:ring-cerulean-600 shrink-0"
                        />
                        <span className="font-mono font-bold text-sm text-navy-900 mt-0.5 shrink-0">
                          {opt.label}.
                        </span>
                        <span className="text-sm sm:text-[15px] leading-relaxed flex-1">
                          {opt.teks}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              )}

              {/* INPUT 2: PILIHAN GANDA KOMPLEKS MCMA (CHECKBOX) */}
              {activeQuestion.type === 'MCMA' && activeQuestion.opsi && (
                <fieldset className="space-y-3">
                  <legend className="sr-only">
                    Pilihan jawaban ganda kompleks soal nomor{' '}
                    {activeQuestion.nomorUrut}
                  </legend>
                  {activeQuestion.opsi.map((opt) => {
                    const checked = (currentAnswer?.mcma ?? []).includes(
                      opt.label
                    );
                    return (
                      <label
                        key={opt.label}
                        className={`flex items-start gap-3.5 p-4 min-h-[54px] rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-sky-50/90 border-cerulean-600 text-navy-900'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            handleMcmaToggle(activeQuestion.id, opt.label)
                          }
                          className="mt-1 w-4 h-4 rounded text-cerulean-600 border-slate-300 focus:ring-cerulean-600 shrink-0"
                        />
                        <span className="font-mono font-bold text-sm text-navy-900 mt-0.5 shrink-0">
                          {opt.label}.
                        </span>
                        <span className="text-sm sm:text-[15px] leading-relaxed flex-1">
                          {opt.teks}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              )}

              {/* INPUT 3: PILIHAN GANDA KOMPLEKS KATEGORI (BENAR / SALAH UNTUK 3 PERNYATAAN) */}
              {activeQuestion.type === 'KATEGORI' &&
                activeQuestion.pernyataan && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                    <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50 text-xs font-semibold text-slate-600">
                      <div className="sm:col-span-8">Pernyataan</div>
                      <div className="sm:col-span-2 text-center">Benar</div>
                      <div className="sm:col-span-2 text-center">Salah</div>
                    </div>

                    {activeQuestion.pernyataan.map((stmt, idx) => {
                      const chosen = currentAnswer?.kategori?.[stmt.id];
                      return (
                        <div
                          key={stmt.id}
                          className="p-4 bg-white grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                        >
                          <div className="sm:col-span-8 flex items-start gap-2.5">
                            <span className="font-mono text-xs font-bold text-slate-500 mt-0.5 shrink-0">
                              {idx + 1}.
                            </span>
                            <p className="text-sm sm:text-[15px] text-navy-900 leading-relaxed">
                              {stmt.teks}
                            </p>
                          </div>

                          <div className="sm:col-span-4 grid grid-cols-2 gap-2">
                            <label
                              className={`flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer transition-colors ${
                                chosen === true
                                  ? 'bg-teal-50 border-toska-600 text-navy-900'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`kat-${activeQuestion.id}-${stmt.id}`}
                                checked={chosen === true}
                                onChange={() =>
                                  handleKategoriSelect(
                                    activeQuestion.id,
                                    stmt.id,
                                    true
                                  )
                                }
                                className="w-4 h-4 text-toska-600 border-slate-300 focus:ring-toska-600"
                              />
                              <span>Benar</span>
                            </label>

                            <label
                              className={`flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer transition-colors ${
                                chosen === false
                                  ? 'bg-sky-50 border-cerulean-600 text-navy-900'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`kat-${activeQuestion.id}-${stmt.id}`}
                                checked={chosen === false}
                                onChange={() =>
                                  handleKategoriSelect(
                                    activeQuestion.id,
                                    stmt.id,
                                    false
                                  )
                                }
                                className="w-4 h-4 text-cerulean-600 border-slate-300 focus:ring-cerulean-600"
                              />
                              <span>Salah</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              {/* Navigasi Sebelumnya / Berikutnya */}
              <div className="pt-5 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-navy-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                {activeIndex < session.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((i) =>
                        Math.min(session.questions.length - 1, i + 1)
                      )
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-cerulean-600 hover:bg-sky-700 transition-colors whitespace-nowrap"
                  >
                    <span>Soal Berikutnya</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors whitespace-nowrap"
                  >
                    <Send className="w-4 h-4 text-toska-500" />
                    <span>Selesai &amp; Kumpulkan</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Panel Kanan: Daftar Nomor Soal & Pengumpulan */}
          <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 xl:sticky xl:top-24 space-y-5">
            <div className="pb-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-navy-900">
                Navigasi Nomor Soal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {answeredCount} terjawab · {unansweredCount} belum lengkap
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {session.questions.map((q, idx) => {
                const isCurrent = idx === activeIndex;
                const done = isQuestionAnswered(q, answers[q.id]);
                const partial = isQuestionPartiallyAnswered(q, answers[q.id]);

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Buka soal nomor ${q.nomorUrut} (${
                      done
                        ? 'sudah dijawab'
                        : partial
                        ? 'sebagian dijawab'
                        : 'belum dijawab'
                    })`}
                    className={`h-11 rounded-xl font-mono text-sm font-semibold tabular-nums border transition-colors ${
                      isCurrent
                        ? 'bg-navy-900 border-navy-900 text-white'
                        : done
                        ? 'bg-teal-50 border-toska-600 text-navy-900'
                        : partial
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {q.nomorUrut}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
              <p>Biru tua: soal sedang dibuka</p>
              <p>Hijau toska: sudah dijawab lengkap</p>
              <p>Putih: belum dijawab</p>
            </div>

            {showSubmitConfirm ? (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-navy-900">
                  Kumpulkan Jawaban Sekarang?
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {unansweredCount > 0
                    ? `Masih ada ${unansweredCount} soal yang belum dijawab lengkap. Yakin ingin mengumpulkan sekarang?`
                    : 'Seluruh soal sudah dijawab. Setelah dikumpulkan, jawaban langsung dinilai otomatis oleh server.'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowSubmitConfirm(false)}
                    className="flex-1 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold text-navy-900 bg-white border border-slate-200 hover:bg-slate-50"
                  >
                    Periksa Lagi
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => performSubmit(false)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-toska-500" />
                    )}
                    <span>Ya, Kumpulkan</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors"
              >
                <Send className="w-4 h-4 text-toska-500" />
                <span>Kumpulkan Asesmen</span>
              </button>
            )}
          </aside>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN 1: HALAMAN MASUK PESERTA MURID
  // =========================================================================
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-toska-600 mb-1">
          Ruang Pengerjaan Murid · SD Fase C (Kelas 5 &amp; Kelas 6)
        </p>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-navy-900">
          Masuk ke Asesmen Sumatif
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">
          Masukkan kode asesmen dari guru serta identitas diri untuk mulai
          mengerjakan soal PG Tunggal, MCMA, dan Kategori secara mandiri.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={(e) => handleStartSession(e)}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5"
        >
          {joinError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-red-950"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{joinError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="kode-asesmen"
              className="block text-sm font-semibold text-navy-900 mb-2"
            >
              Kode Asesmen dari Guru
            </label>
            <input
              id="kode-asesmen"
              type="text"
              value={assessmentCode}
              onChange={(e) => {
                setAssessmentCode(e.target.value.toUpperCase());
                setJoinError(null);
              }}
              placeholder="Contoh: AC-7K9P2Q atau SIMULASI-C"
              className="w-full px-4 py-2.5 min-h-[46px] rounded-xl border border-slate-300 bg-white font-mono text-base font-bold tracking-wider text-navy-900 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-cerulean-600"
            />
          </div>

          <div>
            <label
              htmlFor="nama-murid"
              className="block text-sm font-semibold text-navy-900 mb-2"
            >
              Nama Lengkap Murid
            </label>
            <input
              id="nama-murid"
              type="text"
              value={studentName}
              onChange={(e) => {
                setStudentName(e.target.value);
                setJoinError(null);
              }}
              placeholder="Ketik nama lengkap kamu"
              className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm text-navy-900 placeholder:text-slate-400 focus:border-cerulean-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="kelas-murid"
                className="block text-sm font-semibold text-navy-900 mb-2"
              >
                Kelas
              </label>
              <select
                id="kelas-murid"
                value={studentClass === '' ? '' : String(studentClass)}
                onChange={(e) => {
                  const v = e.target.value;
                  setStudentClass(v === '5' ? 5 : v === '6' ? 6 : '');
                  setJoinError(null);
                }}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm text-navy-900 focus:border-cerulean-600"
              >
                <option value="">-- Pilih Kelas --</option>
                <option value="5">Kelas 5</option>
                <option value="6">Kelas 6</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="absen-murid"
                className="block text-sm font-semibold text-navy-900 mb-2"
              >
                Nomor Absen (Opsional)
              </label>
              <input
                id="absen-murid"
                type="text"
                value={studentAbsen}
                onChange={(e) => setStudentAbsen(e.target.value)}
                placeholder="Contoh: 12"
                className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm text-navy-900 placeholder:text-slate-400 focus:border-cerulean-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 disabled:opacity-60 transition-colors"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memuat Soal dari Server...</span>
              </>
            ) : (
              <>
                <BookOpenCheck className="w-4 h-4 text-toska-500" />
                <span>Mulai Mengerjakan Asesmen</span>
              </>
            )}
          </button>
        </form>

        {/* Panel Informasi Bentuk Soal & Uji Simulasi */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-navy-900">
              Petunjuk Bentuk Jawaban &amp; Keamanan
            </h2>
            <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <li>
                <strong className="text-navy-900 block">
                  1. Pilihan Ganda Tunggal (Radio Button)
                </strong>
                Pilih tepat satu jawaban paling benar dari pilihan A, B, C, atau
                D.
              </li>
              <li>
                <strong className="text-navy-900 block">
                  2. Pilihan Ganda Kompleks MCMA (Checkbox)
                </strong>
                Centang semua pilihan yang benar. Skor penuh diberikan bila
                semua pilihan benar dipilih tanpa pilihan salah (tanpa
                pengurangan nilai tersembunyi).
              </li>
              <li>
                <strong className="text-navy-900 block">
                  3. Pilihan Ganda Kompleks Kategori (Benar / Salah)
                </strong>
                Pilih Benar atau Salah untuk masing-masing dari 3 pernyataan
                pada satu stimulus.
              </li>
            </ul>
            <div className="pt-3 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
              <KeyRound className="w-4 h-4 text-toska-600 shrink-0 mt-0.5" />
              <span>
                Kunci jawaban tersimpan aman di server dan tidak dikirim ke
                perangkat murid sebelum asesmen selesai dikumpulkan.
              </span>
            </div>
          </div>

          <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-5 space-y-3">
            <div>
              <p className="text-xs font-semibold text-cerulean-600">
                Uji Coba Tampilan Murid
              </p>
              <h3 className="text-sm font-bold text-navy-900 mt-0.5">
                Paket Simulasi Terpadu (Kode: SIMULASI-C)
              </h3>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                Coba langsung 6 soal simulasi (2 PG, 2 MCMA, 2 Kategori) lengkap
                dengan timer, pengacakan soal, autosave, dan penilaian otomatis
                server.
              </p>
            </div>
            <button
              type="button"
              disabled={isJoining}
              onClick={() => handleStartSession(undefined, 'SIMULASI-C')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-semibold text-white bg-cerulean-600 hover:bg-sky-700 transition-colors"
            >
              <span>Buka Simulasi Pengerjaan (SIMULASI-C)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
