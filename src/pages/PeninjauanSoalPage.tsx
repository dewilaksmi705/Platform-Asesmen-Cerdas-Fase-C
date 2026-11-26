import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Shuffle,
  Users,
  X,
} from 'lucide-react';
import { QUESTION_TYPE_META, QUESTION_TYPES } from '../data/mockFaseCData';
import {
  fetchTeacherResultsApi,
  publishAssessmentApi,
  updateTeacherQuestionApi,
  updateTeacherSettingsApi,
} from '../services/assessmentApi';
import {
  OptionLabel,
  QuestionType,
  StatementId,
  TeacherAssessmentRecord,
  TeacherQuestion,
  TeacherSessionSummary,
} from '../types/assessment';

interface PeninjauanSoalPageProps {
  assessment: TeacherAssessmentRecord | null;
  teacherToken: string | null;
  onAssessmentUpdated: (updated: TeacherAssessmentRecord) => void;
  onBackToBuilder: () => void;
  onOpenStudentMode: (assessmentCode: string) => void;
}

type FilterMode = 'semua' | QuestionType | 'belum-disetujui';
const OPTION_LABELS: OptionLabel[] = ['A', 'B', 'C', 'D'];
const STATEMENT_IDS: StatementId[] = ['P1', 'P2', 'P3'];

export function PeninjauanSoalPage({
  assessment,
  teacherToken,
  onAssessmentUpdated,
  onBackToBuilder,
  onOpenStudentMode,
}: PeninjauanSoalPageProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('semua');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TeacherQuestion | null>(null);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const [busyGlobal, setBusyGlobal] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const [results, setResults] = useState<TeacherSessionSummary[]>([]);
  const [loadingResults, setLoadingResults] = useState<boolean>(false);

  const loadResults = useCallback(async () => {
    if (!assessment || !teacherToken || assessment.status !== 'published') {
      return;
    }
    setLoadingResults(true);
    try {
      const res = await fetchTeacherResultsApi({
        assessmentId: assessment.id,
        teacherToken,
      });
      setResults(res.results);
    } catch {
      // Abaikan diam-diam saat polling ringan; tombol muat ulang tetap tersedia
    } finally {
      setLoadingResults(false);
    }
  }, [assessment, teacherToken]);

  useEffect(() => {
    if (assessment?.status === 'published') {
      void loadResults();
    }
  }, [assessment?.status, loadResults]);

  const approvedCount = useMemo(() => {
    if (!assessment) return 0;
    return assessment.questions.filter((q) => q.approved).length;
  }, [assessment]);

  const filteredQuestions = useMemo(() => {
    if (!assessment) return [];
    return assessment.questions.filter((q) => {
      if (filterMode === 'semua') return true;
      if (filterMode === 'belum-disetujui') return !q.approved;
      return q.type === filterMode;
    });
  }, [assessment, filterMode]);

  if (!assessment || !teacherToken) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-navy-900">
            Belum Ada Paket Soal untuk Ditinjau
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Susun rancangan pada menu Buat Asesmen dan lakukan pembuatan soal
            melalui Konfigurasi AI terlebih dahulu.
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

  const allApproved =
    assessment.questions.length > 0 &&
    approvedCount === assessment.questions.length;

  const startEdit = (q: TeacherQuestion) => {
    setEditingId(q.id);
    setEditDraft({
      ...q,
      opsi: q.opsi ? q.opsi.map((o) => ({ ...o })) : undefined,
      pernyataan: q.pernyataan ? q.pernyataan.map((p) => ({ ...p })) : undefined,
      kunciMcma: q.kunciMcma ? [...q.kunciMcma] : undefined,
      kunciKategori: q.kunciKategori ? { ...q.kunciKategori } : undefined,
    });
    setErrorMsg(null);
    setStatusMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    if (editDraft.type === 'MCMA' && (editDraft.kunciMcma?.length ?? 0) < 1) {
      setErrorMsg('Pilih minimal satu kunci jawaban benar untuk soal MCMA.');
      return;
    }

    setBusyQuestionId(editDraft.id);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await updateTeacherQuestionApi({
        assessmentId: assessment.id,
        teacherToken,
        questionId: editDraft.id,
        patch: editDraft,
      });
      onAssessmentUpdated(res.assessment);
      setEditingId(null);
      setEditDraft(null);
      setStatusMsg(
        `Perubahan pada Soal #${editDraft.nomor} berhasil disimpan ke server.`
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan perubahan soal.'
      );
    } finally {
      setBusyQuestionId(null);
    }
  };

  const toggleApproveQuestion = async (q: TeacherQuestion) => {
    setBusyQuestionId(q.id);
    setErrorMsg(null);
    try {
      const res = await updateTeacherQuestionApi({
        assessmentId: assessment.id,
        teacherToken,
        questionId: q.id,
        patch: { approved: !q.approved },
      });
      onAssessmentUpdated(res.assessment);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal memperbarui persetujuan.'
      );
    } finally {
      setBusyQuestionId(null);
    }
  };

  const handleApproveAll = async () => {
    setBusyGlobal(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await updateTeacherSettingsApi({
        assessmentId: assessment.id,
        teacherToken,
        approveAll: true,
      });
      onAssessmentUpdated(res.assessment);
      setStatusMsg('Seluruh butir soal telah disetujui guru.');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyetujui semua soal.'
      );
    } finally {
      setBusyGlobal(false);
    }
  };

  const handleToggleShuffle = async () => {
    setBusyGlobal(true);
    setErrorMsg(null);
    try {
      const res = await updateTeacherSettingsApi({
        assessmentId: assessment.id,
        teacherToken,
        acakSoal: !assessment.draft.acakSoal,
      });
      onAssessmentUpdated(res.assessment);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal mengubah pengacakan soal.'
      );
    } finally {
      setBusyGlobal(false);
    }
  };

  const handlePublish = async () => {
    setBusyGlobal(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await publishAssessmentApi({
        assessmentId: assessment.id,
        teacherToken,
      });
      onAssessmentUpdated(res.assessment);
      setStatusMsg(
        `Asesmen berhasil diterbitkan dengan kode ${res.assessment.code}. Kunci jawaban tersimpan aman di server dan tidak dikirim ke browser murid sebelum asesmen selesai.`
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menerbitkan asesmen.'
      );
    } finally {
      setBusyGlobal(false);
    }
  };

  const handleCopyCode = () => {
    if (!assessment.code) return;
    navigator.clipboard?.writeText(assessment.code).then(() => {
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header halaman */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-toska-600 mb-1">
            Peninjauan &amp; Persetujuan Guru · {assessment.providerName}
          </p>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-navy-900">
            {assessment.draft.judul}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            SD Fase C · Peserta Kelas {assessment.draft.kelas} ·{' '}
            {assessment.draft.mataPelajaranNama} · {assessment.questions.length}{' '}
            soal ({assessment.draft.distribusiTipeSoal.PG} PG ·{' '}
            {assessment.draft.distribusiTipeSoal.MCMA} MCMA ·{' '}
            {assessment.draft.distribusiTipeSoal.KATEGORI} Kategori)
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToBuilder}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold text-navy-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Buat Asesmen Baru</span>
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-red-950"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div
          role="status"
          className="bg-teal-50/90 border border-teal-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-navy-900"
        >
          <CheckCircle2 className="w-4 h-4 text-toska-600 shrink-0 mt-0.5" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Panel Kontrol Persetujuan & Penerbitan */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span className="font-semibold text-navy-900 tabular-nums">
                Persetujuan Guru: {approvedCount} / {assessment.questions.length}{' '}
                soal
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-toska-600" />
                Durasi {assessment.draft.durasiMenit} menit
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Shuffle className="w-3.5 h-3.5 text-cerulean-600" />
                {assessment.draft.acakSoal
                  ? 'Urutan soal diacak'
                  : 'Urutan soal tetap'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Kunci jawaban disimpan aman di server dan hanya tampil pada layar
              guru ini; tidak pernah dikirim ke browser murid sebelum selesai.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={busyGlobal}
              onClick={handleToggleShuffle}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-navy-900 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              <Shuffle className="w-3.5 h-3.5 text-cerulean-600" />
              <span>
                {assessment.draft.acakSoal ? 'Nonaktifkan Acak' : 'Aktifkan Acak'}
              </span>
            </button>

            {!allApproved && (
              <button
                type="button"
                disabled={busyGlobal}
                onClick={handleApproveAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-toska-600 bg-teal-50 hover:bg-teal-100 transition-colors whitespace-nowrap"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Setujui Semua Soal</span>
              </button>
            )}

            <button
              type="button"
              disabled={!allApproved || busyGlobal}
              onClick={handlePublish}
              className="inline-flex items-center gap-2 px-5 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {busyGlobal ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-toska-500" />
              )}
              <span>
                {assessment.status === 'published'
                  ? 'Perbarui Terbitan'
                  : 'Terbitkan Asesmen'}
              </span>
            </button>
          </div>
        </div>

        {/* Kartu Kode Asesmen Setelah Diterbitkan */}
        {assessment.status === 'published' && assessment.code && (
          <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-toska-600">
                Asesmen Aktif · Siap Dikerjakan Murid
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-2xl font-bold tracking-wider text-navy-900 tabular-nums">
                  {assessment.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold text-navy-900 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-toska-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Bagikan kode di atas kepada murid Kelas {assessment.draft.kelas}{' '}
                untuk membuka sesi pengerjaan di menu Pengerjaan Murid.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenStudentMode(assessment.code!)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-cerulean-600 hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Buka Halaman Pengerjaan Murid</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* Rekap Hasil Murid (Jika Sudah Diterbitkan) */}
      {assessment.status === 'published' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-cerulean-600 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-navy-900">
                  Pantauan Peserta &amp; Hasil Penilaian Otomatis
                </h2>
                <p className="text-xs text-slate-500">
                  Menampilkan murid yang sedang mengerjakan atau telah selesai
                  mengumpulkan jawaban.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadResults}
              disabled={loadingResults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold text-navy-900 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingResults ? 'animate-spin' : ''}`}
              />
              <span>Muat Ulang</span>
            </button>
          </div>

          {results.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">
              Belum ada murid yang bergabung menggunakan kode{' '}
              <span className="font-mono font-semibold text-navy-900">
                {assessment.code}
              </span>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs">
                    <th className="py-2 pr-4 font-semibold">Nama Murid</th>
                    <th className="py-2 pr-4 font-semibold">Kelas / Absen</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold text-right">
                      Skor / Nilai
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((row) => (
                    <tr key={row.sessionId}>
                      <td className="py-2.5 pr-4 font-medium text-navy-900">
                        <span>{row.studentName}</span>
                        {row.duplicateWarning && (
                          <span className="block text-[11px] text-amber-700 font-normal">
                            Peringatan: nama dan kelas terdeteksi ganda
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600 tabular-nums">
                        Kelas {row.studentClass}
                        {row.studentAbsen ? ` · No. ${row.studentAbsen}` : ''}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`text-xs font-semibold ${
                            row.status === 'submitted'
                              ? 'text-toska-600'
                              : 'text-cerulean-600'
                          }`}
                        >
                          {row.status === 'submitted'
                            ? 'Selesai Dinilai'
                            : 'Sedang Mengerjakan'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono font-semibold text-navy-900 tabular-nums">
                        {row.nilaiAkhir !== null
                          ? `${row.nilaiAkhir} (${row.totalSkorDiperoleh}/${row.totalSkorMaksimal})`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Bilah Filter Tipe Soal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl"
          role="group"
          aria-label="Filter daftar soal peninjauan"
        >
          {(
            [
              { id: 'semua', label: `Semua (${assessment.questions.length})` },
              ...QUESTION_TYPES.map((t) => ({
                id: t,
                label: `${QUESTION_TYPE_META[t].singkatan} (${
                  assessment.questions.filter((q) => q.type === t).length
                })`,
              })),
              {
                id: 'belum-disetujui',
                label: `Belum Disetujui (${
                  assessment.questions.length - approvedCount
                })`,
              },
            ] as { id: FilterMode; label: string }[]
          ).map((tab) => {
            const active = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  active
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daftar Butir Soal */}
      <div className="space-y-4">
        {filteredQuestions.map((q) => {
          const isEditing = editingId === q.id && editDraft !== null;
          const isBusy = busyQuestionId === q.id;
          const typeMeta = QUESTION_TYPE_META[q.type];

          return (
            <article
              key={q.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4"
            >
              {/* Header meta tanpa pill statis */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                  <span className="font-mono font-bold text-navy-900 tabular-nums">
                    Soal #{q.nomor}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-cerulean-600">
                    {typeMeta.nama}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-semibold text-navy-900">
                    {q.cognitiveLevel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-toska-600 font-medium">
                    {q.tpCode} (Kelas {q.tpGrade})
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isEditing && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => startEdit(q)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sunting</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isBusy || isEditing}
                    onClick={() => toggleApproveQuestion(q)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      q.approved
                        ? 'bg-teal-50 text-toska-600 border border-teal-200 hover:bg-teal-100'
                        : 'bg-navy-900 text-white hover:bg-navy-800'
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{q.approved ? 'Disetujui' : 'Setujui Soal'}</span>
                  </button>
                </div>
              </div>

              {isEditing && editDraft ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Indikator Soal
                    </label>
                    <input
                      type="text"
                      value={editDraft.indikatorSoal}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          indikatorSoal: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-navy-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Stimulus / Konteks Bacaan (Opsional)
                    </label>
                    <textarea
                      rows={3}
                      value={editDraft.stimulus}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, stimulus: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-navy-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Pokok Pertanyaan
                    </label>
                    <textarea
                      rows={2}
                      value={editDraft.pertanyaan}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          pertanyaan: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-navy-900"
                    />
                  </div>

                  {/* Editor Opsi untuk PG & MCMA */}
                  {(editDraft.type === 'PG' || editDraft.type === 'MCMA') &&
                    editDraft.opsi && (
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold text-slate-600">
                          {editDraft.type === 'PG'
                            ? 'Pilihan Jawaban A–D (Pilih 1 Kunci Benar)'
                            : 'Pilihan Jawaban A–D (Centang Semua Kunci Benar)'}
                        </p>
                        {OPTION_LABELS.map((label, i) => {
                          const optText = editDraft.opsi?.[i]?.teks ?? '';
                          const isKey =
                            editDraft.type === 'PG'
                              ? editDraft.kunciPg === label
                              : (editDraft.kunciMcma ?? []).includes(label);
                          return (
                            <div
                              key={label}
                              className="flex items-center gap-2.5"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (editDraft.type === 'PG') {
                                    setEditDraft({
                                      ...editDraft,
                                      kunciPg: label,
                                    });
                                  } else {
                                    const current = new Set(
                                      editDraft.kunciMcma ?? []
                                    );
                                    if (current.has(label)) {
                                      current.delete(label);
                                    } else {
                                      current.add(label);
                                    }
                                    setEditDraft({
                                      ...editDraft,
                                      kunciMcma: Array.from(current).sort(),
                                    });
                                  }
                                }}
                                className={`w-9 h-9 rounded-lg font-mono text-xs font-bold shrink-0 border transition-colors ${
                                  isKey
                                    ? 'bg-toska-600 border-toska-600 text-white'
                                    : 'bg-slate-50 border-slate-300 text-slate-600'
                                }`}
                                title={`Tandai ${label} sebagai kunci jawaban`}
                              >
                                {label}
                              </button>
                              <input
                                type="text"
                                value={optText}
                                onChange={(e) => {
                                  const nextOpsi = (editDraft.opsi ?? []).map(
                                    (o, idx) =>
                                      idx === i
                                        ? { ...o, teks: e.target.value }
                                        : o
                                  );
                                  setEditDraft({
                                    ...editDraft,
                                    opsi: nextOpsi,
                                  });
                                }}
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm text-navy-900"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                  {/* Editor 3 Pernyataan untuk KATEGORI */}
                  {editDraft.type === 'KATEGORI' && editDraft.pernyataan && (
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold text-slate-600">
                        Tiga Pernyataan &amp; Kunci Benar / Salah
                      </p>
                      {STATEMENT_IDS.map((sid, i) => {
                        const stmtText = editDraft.pernyataan?.[i]?.teks ?? '';
                        const currentVal = Boolean(
                          editDraft.kunciKategori?.[sid]
                        );
                        return (
                          <div
                            key={sid}
                            className="flex flex-col sm:flex-row sm:items-center gap-2"
                          >
                            <span className="font-mono text-xs font-bold text-navy-900 w-7 shrink-0">
                              {sid}
                            </span>
                            <input
                              type="text"
                              value={stmtText}
                              onChange={(e) => {
                                const nextStmts = (
                                  editDraft.pernyataan ?? []
                                ).map((p, idx) =>
                                  idx === i ? { ...p, teks: e.target.value } : p
                                );
                                setEditDraft({
                                  ...editDraft,
                                  pernyataan: nextStmts,
                                });
                              }}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm text-navy-900"
                            />
                            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditDraft({
                                    ...editDraft,
                                    kunciKategori: {
                                      P1: Boolean(editDraft.kunciKategori?.P1),
                                      P2: Boolean(editDraft.kunciKategori?.P2),
                                      P3: Boolean(editDraft.kunciKategori?.P3),
                                      [sid]: true,
                                    },
                                  })
                                }
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                  currentVal
                                    ? 'bg-toska-600 text-white'
                                    : 'text-slate-600'
                                }`}
                              >
                                Benar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditDraft({
                                    ...editDraft,
                                    kunciKategori: {
                                      P1: Boolean(editDraft.kunciKategori?.P1),
                                      P2: Boolean(editDraft.kunciKategori?.P2),
                                      P3: Boolean(editDraft.kunciKategori?.P3),
                                      [sid]: false,
                                    },
                                  })
                                }
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                  !currentVal
                                    ? 'bg-navy-900 text-white'
                                    : 'text-slate-600'
                                }`}
                              >
                                Salah
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Pembahasan Pedagogis
                    </label>
                    <textarea
                      rows={2}
                      value={editDraft.pembahasan}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          pembahasan: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-navy-900"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={saveEdit}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-white bg-cerulean-600 hover:bg-sky-700 transition-colors"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Simpan Perubahan</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-navy-900">Indikator Soal:</strong>{' '}
                    {q.indikatorSoal}
                  </p>

                  {q.stimulus && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-sm text-slate-800 leading-relaxed">
                      {q.stimulus}
                    </div>
                  )}

                  <p className="text-sm sm:text-[15px] font-semibold text-navy-900 leading-relaxed">
                    {q.pertanyaan}
                  </p>

                  {/* Tampilan opsi PG / MCMA */}
                  {(q.type === 'PG' || q.type === 'MCMA') && q.opsi && (
                    <ul className="space-y-2 text-sm">
                      {q.opsi.map((opt) => {
                        const isCorrect =
                          q.type === 'PG'
                            ? q.kunciPg === opt.label
                            : (q.kunciMcma ?? []).includes(opt.label);
                        return (
                          <li
                            key={opt.label}
                            className={`flex items-start gap-3 px-3.5 py-2.5 rounded-xl border ${
                              isCorrect
                                ? 'bg-teal-50/80 border-teal-200 text-navy-900 font-medium'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="font-mono font-bold text-xs mt-0.5 shrink-0">
                              {opt.label}.
                            </span>
                            <span className="flex-1 leading-relaxed">
                              {opt.teks}
                            </span>
                            {isCorrect && (
                              <span className="text-xs font-semibold text-toska-600 shrink-0 whitespace-nowrap">
                                Kunci Benar
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Tampilan 3 Pernyataan KATEGORI */}
                  {q.type === 'KATEGORI' && q.pernyataan && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 text-sm">
                      {q.pernyataan.map((stmt) => {
                        const isTrue = Boolean(q.kunciKategori?.[stmt.id]);
                        return (
                          <div
                            key={stmt.id}
                            className="px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="font-mono text-xs font-bold text-slate-500 mt-0.5 shrink-0">
                                {stmt.id}
                              </span>
                              <span className="text-navy-900 leading-relaxed">
                                {stmt.teks}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                                isTrue ? 'text-toska-600' : 'text-navy-900'
                              }`}
                            >
                              Kunci: {isTrue ? 'Benar' : 'Salah'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Kunci & Pembahasan Guru */}
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                    <p>
                      <strong className="text-navy-900">Kunci Jawaban:</strong>{' '}
                      {q.type === 'PG'
                        ? q.kunciPg
                        : q.type === 'MCMA'
                        ? (q.kunciMcma ?? []).join(', ')
                        : STATEMENT_IDS.map(
                            (sid) =>
                              `${sid}: ${q.kunciKategori?.[sid] ? 'Benar' : 'Salah'}`
                          ).join(' · ')}
                    </p>
                    <p className="leading-relaxed">
                      <strong className="text-navy-900">Pembahasan:</strong>{' '}
                      {q.pembahasan}
                    </p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
