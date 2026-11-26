import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Layers,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  COGNITIVE_LEVEL_META,
  COGNITIVE_LEVELS,
  DEFAULT_COGNITIVE_DISTRIBUTION,
  DEFAULT_QUESTION_TYPE_DISTRIBUTION,
  QUESTION_TYPE_META,
  QUESTION_TYPES,
} from '../data/mockFaseCData';
import {
  fetchLearningObjectivesFaseC,
  fetchSubjectsFaseC,
} from '../services/tpCatalogService';
import {
  AssessmentDraft,
  CatalogLearningObjective,
  CognitiveDistribution,
  CognitiveLevel,
  KelasFaseC,
  QuestionType,
  QuestionTypeDistribution,
} from '../types/assessment';

export interface PrefillAssessmentSelection {
  kelas: KelasFaseC;
  mataPelajaranNama: string;
  tp: CatalogLearningObjective;
}

interface BuatAsesmenPageProps {
  initialDraft?: AssessmentDraft | null;
  prefillSelection?: PrefillAssessmentSelection | null;
  onClearPrefill?: () => void;
  onOpenKatalog: () => void;
  onProceedToAi: (draft: AssessmentDraft) => void;
  isProceedingToAi?: boolean;
}

const STEP_LIST = [
  { id: 1, title: 'Identitas & Mapel', short: 'Identitas' },
  { id: 2, title: 'Tujuan Pembelajaran', short: 'Tujuan (TP)' },
  { id: 3, title: 'Soal & Kognitif', short: 'Komposisi' },
  { id: 4, title: 'Tinjau Rancangan', short: 'Tinjauan' },
] as const;

const DEFAULT_PROPORTION_WEIGHTS: CognitiveDistribution = {
  C1: 3,
  C2: 6,
  C3: 9,
  C4: 6,
  C5: 3,
  C6: 3,
};

function scaleDistributionProportionally(
  source: CognitiveDistribution,
  targetTotal: number
): CognitiveDistribution {
  const sourceTotal = COGNITIVE_LEVELS.reduce(
    (sum, lvl) => sum + source[lvl],
    0
  );
  const basis = sourceTotal > 0 ? source : DEFAULT_PROPORTION_WEIGHTS;
  const basisTotal = COGNITIVE_LEVELS.reduce((sum, lvl) => sum + basis[lvl], 0);

  const exactEntries = COGNITIVE_LEVELS.map((level) => {
    const exact = (basis[level] / basisTotal) * targetTotal;
    const floored = Math.floor(exact);
    return {
      level,
      floored,
      remainder: exact - floored,
    };
  });

  const next: CognitiveDistribution = {
    C1: 0,
    C2: 0,
    C3: 0,
    C4: 0,
    C5: 0,
    C6: 0,
  };

  let assigned = 0;
  exactEntries.forEach(({ level, floored }) => {
    next[level] = floored;
    assigned += floored;
  });

  const tieBreakOrder: CognitiveLevel[] = ['C3', 'C2', 'C4', 'C1', 'C5', 'C6'];
  const sortedByRemainder = [...exactEntries].sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 1e-9) {
      return b.remainder - a.remainder;
    }
    return tieBreakOrder.indexOf(a.level) - tieBreakOrder.indexOf(b.level);
  });

  let idx = 0;
  while (assigned < targetTotal) {
    const pick = sortedByRemainder[idx % sortedByRemainder.length];
    next[pick.level] += 1;
    assigned += 1;
    idx += 1;
  }

  return next;
}

const DEFAULT_QUESTION_TYPE_WEIGHTS: QuestionTypeDistribution = {
  PG: 18,
  MCMA: 6,
  KATEGORI: 6,
};

function scaleQuestionTypesProportionally(
  source: QuestionTypeDistribution,
  targetTotal: number
): QuestionTypeDistribution {
  const sourceTotal = QUESTION_TYPES.reduce((sum, t) => sum + source[t], 0);
  const basis = sourceTotal > 0 ? source : DEFAULT_QUESTION_TYPE_WEIGHTS;
  const basisTotal = QUESTION_TYPES.reduce((sum, t) => sum + basis[t], 0);

  const exactEntries = QUESTION_TYPES.map((type) => {
    const exact = (basis[type] / basisTotal) * targetTotal;
    const floored = Math.floor(exact);
    return {
      type,
      floored,
      remainder: exact - floored,
    };
  });

  const next: QuestionTypeDistribution = { PG: 0, MCMA: 0, KATEGORI: 0 };
  let assigned = 0;
  exactEntries.forEach(({ type, floored }) => {
    next[type] = floored;
    assigned += floored;
  });

  const tieOrder: QuestionType[] = ['PG', 'MCMA', 'KATEGORI'];
  const sorted = [...exactEntries].sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 1e-9) {
      return b.remainder - a.remainder;
    }
    return tieOrder.indexOf(a.type) - tieOrder.indexOf(b.type);
  });

  let idx = 0;
  while (assigned < targetTotal) {
    const pick = sorted[idx % sorted.length];
    next[pick.type] += 1;
    assigned += 1;
    idx += 1;
  }

  return next;
}

function createInitialDraft(): AssessmentDraft {
  return {
    judul: '',
    jenjang: 'SD',
    fase: 'C',
    kelas: null,
    mataPelajaranNama: '',
    selectedTps: [],
    jumlahSoal: 30,
    distribusiTipeSoal: { ...DEFAULT_QUESTION_TYPE_DISTRIBUTION },
    distribusiKognitif: { ...DEFAULT_COGNITIVE_DISTRIBUTION },
    durasiMenit: 60,
    acakSoal: true,
  };
}

export function BuatAsesmenPage({
  initialDraft,
  prefillSelection,
  onClearPrefill,
  onOpenKatalog,
  onProceedToAi,
  isProceedingToAi = false,
}: BuatAsesmenPageProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [draft, setDraft] = useState<AssessmentDraft>(() =>
    initialDraft
      ? {
          ...initialDraft,
          selectedTps: [],
          distribusiTipeSoal: { ...initialDraft.distribusiTipeSoal },
          distribusiKognitif: { ...initialDraft.distribusiKognitif },
        }
      : createInitialDraft()
  );

  // Satu state terpusat untuk menyimpan seluruh ID unik TP yang dipilih
  const [selectedTPIds, setSelectedTPIds] = useState<string[]>(() =>
    Array.from(new Set((initialDraft?.selectedTps ?? []).map((tp) => tp.id)))
  );
  const [seedTpsById, setSeedTpsById] = useState<
    Record<string, CatalogLearningObjective>
  >(() => {
    const initialMap: Record<string, CatalogLearningObjective> = {};
    for (const tp of initialDraft?.selectedTps ?? []) {
      initialMap[tp.id] = tp;
    }
    return initialMap;
  });

  const [jumlahSoalInput, setJumlahSoalInput] = useState<string>(() =>
    String(initialDraft?.jumlahSoal ?? 30)
  );
  const [jumlahSoalChangedPrompt, setJumlahSoalChangedPrompt] =
    useState<boolean>(false);
  const [typeAdjustmentFeedback, setTypeAdjustmentFeedback] = useState<
    string | null
  >(null);
  const [adjustmentFeedback, setAdjustmentFeedback] = useState<string | null>(
    null
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );

  // State dinamis dari Supabase (tanpa fallback dummy data)
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [subjectsReloadTick, setSubjectsReloadTick] = useState<number>(0);

  const [tpList, setTpList] = useState<CatalogLearningObjective[]>([]);
  const [tpLoading, setTpLoading] = useState<boolean>(false);
  const [tpError, setTpError] = useState<string | null>(null);
  const [tpReloadTick, setTpReloadTick] = useState<number>(0);
  const [tpSearchQuery, setTpSearchQuery] = useState<string>('');

  // Tangani prefill dari halaman Katalog TP
  useEffect(() => {
    if (prefillSelection) {
      setDraft((prev) => ({
        ...prev,
        kelas: prefillSelection.kelas,
        mataPelajaranNama: prefillSelection.mataPelajaranNama,
      }));
      setSeedTpsById((prev) => ({
        ...prev,
        [prefillSelection.tp.id]: prefillSelection.tp,
      }));
      setSelectedTPIds([prefillSelection.tp.id]);
      setTpSearchQuery('');
      setCurrentStep(2);
      setValidationMessage(null);
      onClearPrefill?.();
    }
  }, [prefillSelection, onClearPrefill]);

  // Ambil seluruh daftar mata pelajaran Fase C (Kelas 5 & 6) secara dinamis dari Supabase
  useEffect(() => {
    let cancelled = false;

    setSubjectsLoading(true);
    setSubjectsError(null);

    fetchSubjectsFaseC()
      .then((result) => {
        if (cancelled) return;
        setSubjects(result);
        setSubjectsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSubjects([]);
        setSubjectsError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat daftar mata pelajaran dari Supabase.'
        );
        setSubjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subjectsReloadTick]);

  // Ambil seluruh TP Fase C (gabungan Kelas 5 DAN Kelas 6, tanpa dibatasi kelas peserta)
  useEffect(() => {
    if (!draft.mataPelajaranNama.trim()) {
      setTpList([]);
      setTpLoading(false);
      setTpError(null);
      return;
    }

    let cancelled = false;
    const activeSubject = draft.mataPelajaranNama;

    setTpLoading(true);
    setTpError(null);
    setTpList([]);

    fetchLearningObjectivesFaseC(activeSubject)
      .then((items) => {
        if (cancelled) return;
        setTpList(items);
        setTpLoading(false);
        setSelectedTPIds((prev) => {
          if (prev.length === 0) return prev;
          const validIds = new Set(items.map((item) => item.id));
          const synced = prev.filter((id) => validIds.has(id));
          return synced.length === prev.length ? prev : synced;
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTpList([]);
        setTpError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat Tujuan Pembelajaran dari Supabase.'
        );
        setTpLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draft.mataPelajaranNama, tpReloadTick]);

  const tpByIdMap = useMemo(() => {
    const map = new Map<string, CatalogLearningObjective>();
    Object.values(seedTpsById).forEach((tp) => {
      map.set(tp.id, tp);
    });
    for (const tp of tpList) {
      map.set(tp.id, tp);
    }
    return map;
  }, [seedTpsById, tpList]);

  const selectedTPIdSet = useMemo(() => {
    return new Set(selectedTPIds);
  }, [selectedTPIds]);

  const selectedTps = useMemo(() => {
    const resolved: CatalogLearningObjective[] = [];
    for (const id of selectedTPIds) {
      const tp = tpByIdMap.get(id);
      if (tp) {
        resolved.push(tp);
      }
    }
    return resolved;
  }, [selectedTPIds, tpByIdMap]);

  const filteredTpList = useMemo(() => {
    const q = tpSearchQuery.trim().toLowerCase();
    if (!q) return tpList;
    return tpList.filter(
      (tp) =>
        tp.tp_code.toLowerCase().includes(q) ||
        tp.element.toLowerCase().includes(q) ||
        tp.tp_text.toLowerCase().includes(q) ||
        tp.material_scope.toLowerCase().includes(q)
    );
  }, [tpList, tpSearchQuery]);

  const totalQuestionTypes = useMemo(() => {
    return QUESTION_TYPES.reduce(
      (sum, t) => sum + draft.distribusiTipeSoal[t],
      0
    );
  }, [draft.distribusiTipeSoal]);

  const questionTypeDiff = draft.jumlahSoal - totalQuestionTypes;
  const isQuestionTypeValid = totalQuestionTypes === draft.jumlahSoal;

  const totalCognitive = useMemo(() => {
    return COGNITIVE_LEVELS.reduce(
      (sum, lvl) => sum + draft.distribusiKognitif[lvl],
      0
    );
  }, [draft.distribusiKognitif]);

  const cognitiveDiff = draft.jumlahSoal - totalCognitive;
  const isCognitiveValid = totalCognitive === draft.jumlahSoal;
  const isStep3Blocked =
    currentStep === 3 && (!isQuestionTypeValid || !isCognitiveValid);

  const handleKelasDropdownChange = (rawValue: string) => {
    const nextKelas: KelasFaseC | null =
      rawValue === '5' ? 5 : rawValue === '6' ? 6 : null;

    // Kelas yang dipilih adalah kelas peserta asesmen, bukan pembatas sumber TP
    setDraft((prev) => ({
      ...prev,
      kelas: nextKelas,
    }));
    setValidationMessage(null);
  };

  const handleSubjectDropdownChange = (subjectName: string) => {
    // Jika mata pelajaran berubah, kosongkan TP terpilih sebelumnya dan muat ulang daftar TP Fase C
    setDraft((prev) => ({
      ...prev,
      mataPelajaranNama: subjectName,
    }));
    setSelectedTPIds([]);
    setSeedTpsById({});
    setTpSearchQuery('');
    setValidationMessage(null);
  };

  const handleToggleTp = useCallback(
    (tpId: string, forceChecked?: boolean) => {
      setSelectedTPIds((prev) => {
        const exists = prev.includes(tpId);
        const shouldSelect =
          typeof forceChecked === 'boolean' ? forceChecked : !exists;
        if (shouldSelect) {
          return exists ? prev : [...prev, tpId];
        }
        return exists ? prev.filter((id) => id !== tpId) : prev;
      });
      setValidationMessage(null);
    },
    []
  );

  const selectAllVisibleTps = useCallback(() => {
    if (filteredTpList.length === 0) return;
    setSelectedTPIds((prev) => {
      const existing = new Set(prev);
      const additions: string[] = [];
      for (const tp of filteredTpList) {
        if (!existing.has(tp.id)) {
          existing.add(tp.id);
          additions.push(tp.id);
        }
      }
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
    setValidationMessage(null);
  }, [filteredTpList]);

  const clearSelectedTps = useCallback(() => {
    setSelectedTPIds([]);
  }, []);

  const buildSubmissionDraft = useCallback((): AssessmentDraft => {
    return {
      ...draft,
      selectedTps: [...selectedTps],
      distribusiTipeSoal: { ...draft.distribusiTipeSoal },
      distribusiKognitif: { ...draft.distribusiKognitif },
    };
  }, [draft, selectedTps]);

  const applyJumlahSoal = (nextValue: number) => {
    const clamped = Math.max(5, Math.min(60, Math.round(nextValue)));
    setJumlahSoalInput(String(clamped));
    setDraft((prev) => ({
      ...prev,
      jumlahSoal: clamped,
    }));
    setTypeAdjustmentFeedback(null);
    setAdjustmentFeedback(null);
    setJumlahSoalChangedPrompt(
      clamped !== totalCognitive || clamped !== totalQuestionTypes
    );
    setValidationMessage(null);
  };

  const handleJumlahSoalTyping = (rawValue: string) => {
    setJumlahSoalInput(rawValue);
    setTypeAdjustmentFeedback(null);
    setAdjustmentFeedback(null);
    setValidationMessage(null);

    if (rawValue.trim() === '') {
      return;
    }

    const parsed = parseInt(rawValue, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 60) {
      setDraft((prev) => ({
        ...prev,
        jumlahSoal: parsed,
      }));
      setJumlahSoalChangedPrompt(
        parsed !== totalCognitive || parsed !== totalQuestionTypes
      );
    }
  };

  const handleJumlahSoalBlur = () => {
    const parsed = parseInt(jumlahSoalInput, 10);
    if (Number.isNaN(parsed)) {
      setJumlahSoalInput(String(draft.jumlahSoal));
      return;
    }
    applyJumlahSoal(parsed);
  };

  const handleQuestionTypeStep = (type: QuestionType, delta: number) => {
    setDraft((prev) => {
      const nextVal = Math.max(
        0,
        Math.min(60, prev.distribusiTipeSoal[type] + delta)
      );
      const nextDist = {
        ...prev.distribusiTipeSoal,
        [type]: nextVal,
      };
      const nextTypeTotal = QUESTION_TYPES.reduce(
        (sum, t) => sum + nextDist[t],
        0
      );
      const cogTotal = COGNITIVE_LEVELS.reduce(
        (sum, lvl) => sum + prev.distribusiKognitif[lvl],
        0
      );
      if (nextTypeTotal === prev.jumlahSoal && cogTotal === prev.jumlahSoal) {
        setJumlahSoalChangedPrompt(false);
      }
      return {
        ...prev,
        distribusiTipeSoal: nextDist,
      };
    });
    setTypeAdjustmentFeedback(null);
    setValidationMessage(null);
  };

  const handleQuestionTypeInput = (type: QuestionType, rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeVal =
      rawValue.trim() === '' || Number.isNaN(parsed)
        ? 0
        : Math.max(0, Math.min(60, parsed));

    setDraft((prev) => {
      const nextDist = {
        ...prev.distribusiTipeSoal,
        [type]: safeVal,
      };
      const nextTypeTotal = QUESTION_TYPES.reduce(
        (sum, t) => sum + nextDist[t],
        0
      );
      const cogTotal = COGNITIVE_LEVELS.reduce(
        (sum, lvl) => sum + prev.distribusiKognitif[lvl],
        0
      );
      if (nextTypeTotal === prev.jumlahSoal && cogTotal === prev.jumlahSoal) {
        setJumlahSoalChangedPrompt(false);
      }
      return {
        ...prev,
        distribusiTipeSoal: nextDist,
      };
    });
    setTypeAdjustmentFeedback(null);
    setValidationMessage(null);
  };

  const handleAdjustTypesProportional = () => {
    setDraft((prev) => ({
      ...prev,
      distribusiTipeSoal: scaleQuestionTypesProportionally(
        prev.distribusiTipeSoal,
        prev.jumlahSoal
      ),
    }));
    if (isCognitiveValid) {
      setJumlahSoalChangedPrompt(false);
    }
    setTypeAdjustmentFeedback(
      `Komposisi bentuk soal (PG, MCMA, Kategori) telah disesuaikan secara proporsional menjadi total ${draft.jumlahSoal} soal.`
    );
    setValidationMessage(null);
  };

  const handleApplyDefaultTypes = () => {
    setDraft((prev) => ({
      ...prev,
      distribusiTipeSoal: scaleQuestionTypesProportionally(
        DEFAULT_QUESTION_TYPE_WEIGHTS,
        prev.jumlahSoal
      ),
    }));
    if (isCognitiveValid) {
      setJumlahSoalChangedPrompt(false);
    }
    setTypeAdjustmentFeedback(
      `Komposisi bentuk soal diatur ke proporsi standar (60% PG · 20% MCMA · 20% Kategori) untuk ${draft.jumlahSoal} soal.`
    );
    setValidationMessage(null);
  };

  const handleCognitiveStep = (level: CognitiveLevel, delta: number) => {
    setDraft((prev) => {
      const nextVal = Math.max(
        0,
        Math.min(60, prev.distribusiKognitif[level] + delta)
      );
      const nextDist = {
        ...prev.distribusiKognitif,
        [level]: nextVal,
      };
      const nextTotal = COGNITIVE_LEVELS.reduce(
        (sum, lvl) => sum + nextDist[lvl],
        0
      );
      if (nextTotal === prev.jumlahSoal) {
        setJumlahSoalChangedPrompt(false);
      }
      return {
        ...prev,
        distribusiKognitif: nextDist,
      };
    });
    setAdjustmentFeedback(null);
    setValidationMessage(null);
  };

  const handleCognitiveInput = (level: CognitiveLevel, rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const safeVal =
      rawValue.trim() === '' || Number.isNaN(parsed)
        ? 0
        : Math.max(0, Math.min(60, parsed));

    setDraft((prev) => {
      const nextDist = {
        ...prev.distribusiKognitif,
        [level]: safeVal,
      };
      const nextTotal = COGNITIVE_LEVELS.reduce(
        (sum, lvl) => sum + nextDist[lvl],
        0
      );
      if (nextTotal === prev.jumlahSoal) {
        setJumlahSoalChangedPrompt(false);
      }
      return {
        ...prev,
        distribusiKognitif: nextDist,
      };
    });
    setAdjustmentFeedback(null);
    setValidationMessage(null);
  };

  const handleAdjustProportional = () => {
    setDraft((prev) => ({
      ...prev,
      distribusiKognitif: scaleDistributionProportionally(
        prev.distribusiKognitif,
        prev.jumlahSoal
      ),
    }));
    setJumlahSoalChangedPrompt(false);
    setAdjustmentFeedback(
      `Distribusi C1–C6 telah disesuaikan secara proporsional menjadi total ${draft.jumlahSoal} soal.`
    );
    setValidationMessage(null);
  };

  const handleApplyDefaultProportion = () => {
    setDraft((prev) => ({
      ...prev,
      distribusiKognitif: scaleDistributionProportionally(
        DEFAULT_PROPORTION_WEIGHTS,
        prev.jumlahSoal
      ),
    }));
    setJumlahSoalChangedPrompt(false);
    setAdjustmentFeedback(
      `Distribusi C1–C6 diatur menggunakan proporsi standar (10%–20%–30%–20%–10%–10%) untuk ${draft.jumlahSoal} soal.`
    );
    setValidationMessage(null);
  };

  const handleDurasiChange = (val: number) => {
    const safe = Math.max(15, Math.min(180, Math.round(val || 15)));
    setDraft((prev) => ({ ...prev, durasiMenit: safe }));
  };

  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (!draft.judul.trim()) {
        return 'Mohon isi judul asesmen terlebih dahulu agar rancangan mudah dikenali.';
      }
      if (draft.kelas === null) {
        return 'Mohon pilih Kelas 5 atau Kelas 6 terlebih dahulu.';
      }
      if (!draft.mataPelajaranNama.trim()) {
        return 'Mohon pilih mata pelajaran yang tersedia dari katalog Supabase terlebih dahulu.';
      }
    }
    if (step === 2) {
      if (selectedTPIds.length === 0) {
        return 'Pilih minimal satu Tujuan Pembelajaran (TP) sebelum melanjutkan.';
      }
    }
    if (step === 3) {
      if (totalQuestionTypes !== draft.jumlahSoal) {
        return `Total bentuk soal PG, MCMA, dan Kategori (${totalQuestionTypes} soal) harus sama dengan jumlah soal (${draft.jumlahSoal} soal).`;
      }
      if (totalCognitive !== draft.jumlahSoal) {
        return `Total distribusi tingkat kognitif (${totalCognitive} soal) harus sama dengan jumlah soal (${draft.jumlahSoal} soal). Gunakan tombol "Sesuaikan Secara Proporsional" atau atur ulang angkanya secara manual.`;
      }
    }
    return null;
  };

  const goNextStep = () => {
    const error = validateStep(currentStep);
    if (error) {
      setValidationMessage(error);
      return;
    }
    setValidationMessage(null);
    setCurrentStep((prev) => Math.min(4, prev + 1));
  };

  const goPrevStep = () => {
    setValidationMessage(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleJumpToStep = (target: number) => {
    if (target < currentStep) {
      setValidationMessage(null);
      setCurrentStep(target);
      return;
    }
    for (let s = currentStep; s < target; s += 1) {
      const err = validateStep(s);
      if (err) {
        setValidationMessage(err);
        return;
      }
    }
    setValidationMessage(null);
    setCurrentStep(target);
  };

  const handleReset = () => {
    setDraft(createInitialDraft());
    setSelectedTPIds([]);
    setSeedTpsById({});
    setJumlahSoalInput('30');
    setJumlahSoalChangedPrompt(false);
    setTypeAdjustmentFeedback(null);
    setAdjustmentFeedback(null);
    if (subjectsError || subjects.length === 0) {
      setSubjectsError(null);
      setSubjectsReloadTick((n) => n + 1);
    }
    setTpList([]);
    setTpError(null);
    setTpSearchQuery('');
    setCurrentStep(1);
    setValidationMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header halaman */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-toska-600 mb-1">
            Formulir Bertahap · Khusus SD Fase C
          </p>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-navy-900">
            Buat Asesmen Sumatif
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Lengkapi parameter asesmen secara bertahap menggunakan katalog
            Tujuan Pembelajaran resmi dari Supabase. Seluruh soal hasil AI wajib
            diperiksa dan disetujui guru sebelum diterbitkan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium text-slate-600 hover:text-navy-900 hover:bg-slate-200/60 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Atur Ulang Formulir</span>
        </button>
      </div>

      {/* Penanda sumber katalog Supabase */}
      <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-navy-900">
        <Database className="w-4 h-4 text-cerulean-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-xs sm:text-sm">
          <span className="font-semibold">Katalog TP Terhubung Supabase:</span>{' '}
          Daftar mata pelajaran dan Tujuan Pembelajaran diambil secara dinamis
          dari view{' '}
          <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-sky-200">
            public.v_learning_objectives_catalog
          </code>{' '}
          untuk satu tahun pembelajaran penuh (tanpa filter semester).
        </p>
      </div>

      {/* Stepper navigasi bertahap */}
      <nav
        aria-label="Tahapan pembuatan asesmen"
        className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4"
      >
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STEP_LIST.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isStepDisabled = isStep3Blocked && step.id > 3;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={isStepDisabled}
                  onClick={() => handleJumpToStep(step.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[48px] rounded-xl text-left transition-colors ${
                    isActive
                      ? 'bg-navy-900 text-white'
                      : isStepDisabled
                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-70'
                      : isCompleted
                      ? 'bg-teal-50/80 text-navy-900 hover:bg-teal-50'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-navy-900'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-semibold shrink-0 tabular-nums ${
                      isActive
                        ? 'bg-toska-500 text-navy-950'
                        : isCompleted
                        ? 'bg-toska-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[11px] leading-none mb-1 ${
                        isActive ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      Langkah {step.id}
                    </span>
                    <span className="block text-xs sm:text-sm font-semibold truncate">
                      {step.short}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Konten Utama + Panel Ringkasan */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Area Formulir */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          {validationMessage && (
            <div
              role="alert"
              className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-amber-950"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{validationMessage}</span>
            </div>
          )}

          {/* LANGKAH 1: Identitas, Kelas Peserta (5/6), dan Mata Pelajaran Fase C */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-navy-900">
                  1. Identitas dan Ruang Lingkup Asesmen
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Jenjang <strong>SD</strong> dan <strong>Fase C</strong>{' '}
                  ditetapkan otomatis. Pilih kelas peserta asesmen dan mata
                  pelajaran untuk menampilkan seluruh TP Fase C.
                </p>
              </div>

              {/* Judul Asesmen */}
              <div>
                <label
                  htmlFor="judul-asesmen"
                  className="block text-sm font-semibold text-navy-900 mb-2"
                >
                  Judul Asesmen
                </label>
                <input
                  id="judul-asesmen"
                  type="text"
                  value={draft.judul}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, judul: e.target.value }));
                    setValidationMessage(null);
                  }}
                  placeholder="Contoh: Asesmen Sumatif Akhir Lingkup Materi — Kelas 5"
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm text-navy-900 placeholder:text-slate-400 focus:border-cerulean-600 transition-colors"
                />
              </div>

              {/* Pilihan Kelas Peserta (Hanya Kelas 5 atau Kelas 6) */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="dropdown-kelas"
                    className="text-sm font-semibold text-navy-900"
                  >
                    Kelas Peserta Asesmen
                  </label>
                  <span className="text-xs text-slate-500">
                    SD · Fase C (ditetapkan otomatis)
                  </span>
                </div>
                <select
                  id="dropdown-kelas"
                  value={draft.kelas === null ? '' : String(draft.kelas)}
                  onChange={(e) => handleKelasDropdownChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm text-navy-900 focus:border-cerulean-600 transition-colors"
                >
                  <option value="">
                    -- Pilih Kelas Peserta (Kelas 5 atau Kelas 6) --
                  </option>
                  <option value="5">Kelas 5</option>
                  <option value="6">Kelas 6</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Kelas yang dipilih menentukan kelas peserta asesmen, bukan
                  pembatas sumber TP. Guru tetap dapat memilih kombinasi TP
                  Kelas 5 dan Kelas 6 dalam Fase C.
                </p>
              </div>

              {/* Pilihan Mata Pelajaran Fase C (Dinamis dari Supabase) */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="dropdown-mapel"
                    className="text-sm font-semibold text-navy-900"
                  >
                    Mata Pelajaran
                  </label>
                  {subjectsLoading && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cerulean-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Memuat dari Supabase...
                    </span>
                  )}
                </div>

                <select
                  id="dropdown-mapel"
                  value={draft.mataPelajaranNama}
                  disabled={
                    subjectsLoading ||
                    Boolean(subjectsError) ||
                    subjects.length === 0
                  }
                  onChange={(e) => handleSubjectDropdownChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm text-navy-900 focus:border-cerulean-600 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  <option value="">
                    {subjectsLoading
                      ? 'Memuat daftar mata pelajaran Fase C...'
                      : subjectsError
                      ? 'Gagal memuat mata pelajaran'
                      : subjects.length === 0
                      ? 'Belum ada mata pelajaran Fase C di katalog'
                      : '-- Pilih Mata Pelajaran --'}
                  </option>
                  {subjects.map((subjectName) => (
                    <option key={subjectName} value={subjectName}>
                      {subjectName}
                    </option>
                  ))}
                </select>

                {/* Status Error koneksi Supabase untuk Mata Pelajaran */}
                {subjectsError && (
                  <div
                    role="alert"
                    className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs sm:text-sm text-red-950"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{subjectsError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubjectsReloadTick((n) => n + 1)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold text-red-900 bg-white border border-red-200 hover:bg-red-100/60 transition-colors whitespace-nowrap shrink-0 self-start"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Coba Lagi</span>
                    </button>
                  </div>
                )}

                {/* Pesan jika data mata pelajaran kosong */}
                {!subjectsLoading && !subjectsError && subjects.length === 0 && (
                  <p className="mt-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                    Belum ditemukan data mata pelajaran pada{' '}
                    <span className="font-mono">
                      public.v_learning_objectives_catalog
                    </span>{' '}
                    untuk SD Fase C (Kelas 5 dan Kelas 6).
                  </p>
                )}

                {/* Ringkasan kesiapan TP Fase C */}
                {draft.mataPelajaranNama && !subjectsError && (
                  <div className="mt-3 bg-teal-50/70 border border-teal-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-navy-900 flex items-center justify-between gap-3">
                    {tpLoading ? (
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <Loader2 className="w-4 h-4 text-cerulean-600 animate-spin shrink-0" />
                        Memuat seluruh TP Fase C untuk{' '}
                        <strong>{draft.mataPelajaranNama}</strong>...
                      </span>
                    ) : tpError ? (
                      <span className="inline-flex items-center gap-2 text-red-800">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        Gagal memuat TP dari Supabase. Klik Lanjut untuk melihat
                        detail galat dan mencoba ulang.
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-toska-600 shrink-0" />
                        <span>
                          Tersedia{' '}
                          <strong className="font-mono tabular-nums">
                            {tpList.length}
                          </strong>{' '}
                          TP Fase C untuk{' '}
                          <strong>{draft.mataPelajaranNama}</strong>.
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LANGKAH 2: Tujuan Pembelajaran (TP) Gabungan Fase C dari Supabase */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-navy-900">
                    2. Pilih Tujuan Pembelajaran (TP)
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {draft.mataPelajaranNama} · Kelas Peserta:{' '}
                    <strong>Kelas {draft.kelas}</strong> · Katalog Gabungan Fase
                    C
                  </p>
                </div>

                {!tpLoading && !tpError && tpList.length > 0 && (
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <button
                      type="button"
                      disabled={filteredTpList.length === 0}
                      onClick={selectAllVisibleTps}
                      className="text-cerulean-600 hover:text-navy-900 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      Pilih Semua Tampil
                    </button>
                    <span className="text-slate-300" aria-hidden="true">
                      /
                    </span>
                    <button
                      type="button"
                      disabled={selectedTPIds.length === 0}
                      onClick={clearSelectedTps}
                      className="text-slate-500 hover:text-navy-900 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      Kosongkan
                    </button>
                  </div>
                )}
              </div>

              {/* Pencarian TP & Jumlah TP Dipilih */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={tpSearchQuery}
                    onChange={(e) => setTpSearchQuery(e.target.value)}
                    disabled={
                      tpLoading || Boolean(tpError) || tpList.length === 0
                    }
                    placeholder="Cari kode TP, elemen, rumusan TP, atau ruang lingkup materi..."
                    aria-label="Cari Tujuan Pembelajaran"
                    className="w-full pl-10 pr-9 py-2.5 min-h-[42px] rounded-xl border border-slate-300 bg-white text-sm text-navy-900 placeholder:text-slate-400 focus:border-cerulean-600 disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
                  />
                  {tpSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTpSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-navy-900"
                      aria-label="Hapus pencarian TP"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div
                  aria-live="polite"
                  className="text-xs font-mono tabular-nums font-semibold text-navy-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 whitespace-nowrap shrink-0"
                >
                  {selectedTPIds.length} dari {tpList.length} TP dipilih
                </div>
              </div>

              {/* Kondisi Loading */}
              {tpLoading && (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3 border border-slate-200 rounded-xl bg-slate-50/50">
                  <Loader2 className="w-6 h-6 text-cerulean-600 animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-navy-900">
                      Memuat daftar Tujuan Pembelajaran Fase C...
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mengambil seluruh TP Fase C untuk{' '}
                      {draft.mataPelajaranNama} dari Supabase.
                    </p>
                  </div>
                </div>
              )}

              {/* Kondisi Gagal Koneksi Supabase (Tanpa Data Dummy) */}
              {!tpLoading && tpError && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3 text-red-950"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold">
                        Gagal Memuat Tujuan Pembelajaran dari Supabase
                      </p>
                      <p className="text-xs sm:text-sm leading-relaxed text-red-900">
                        {tpError}
                      </p>
                    </div>
                  </div>
                  <div className="pl-8">
                    <button
                      type="button"
                      onClick={() => setTpReloadTick((n) => n + 1)}
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[38px] rounded-lg text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Muat Ulang Data TP</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Kondisi Data Kosong dari Supabase */}
              {!tpLoading && !tpError && tpList.length === 0 && (
                <div className="border border-slate-200 rounded-xl p-8 text-center space-y-2 bg-slate-50/60">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-navy-900">
                    Belum Ada Tujuan Pembelajaran Tersedia
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    Tidak ditemukan data TP pada katalog Supabase untuk{' '}
                    <strong>{draft.mataPelajaranNama}</strong> (SD Fase C ·
                    Kelas 5 dan Kelas 6).
                  </p>
                </div>
              )}

              {/* Kondisi Hasil Pencarian Kosong */}
              {!tpLoading &&
                !tpError &&
                tpList.length > 0 &&
                filteredTpList.length === 0 && (
                  <div className="border border-slate-200 rounded-xl p-8 text-center space-y-2 bg-slate-50/60">
                    <p className="text-sm font-semibold text-navy-900">
                      Tidak ada TP yang cocok dengan kata kunci pencarian saat
                      ini.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTpSearchQuery('')}
                      className="text-xs font-semibold text-cerulean-600 hover:text-navy-900 transition-colors"
                    >
                      Tampilkan semua {tpList.length} TP Fase C
                    </button>
                  </div>
                )}

              {/* Daftar Gabungan TP Fase C dengan Checkbox */}
              {!tpLoading && !tpError && filteredTpList.length > 0 && (
                <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                  {filteredTpList.map((tp) => {
                    const checked = selectedTPIdSet.has(tp.id);
                    const checkboxId = `tp-checkbox-${tp.id.replace(
                      /[^a-zA-Z0-9_-]/g,
                      '_'
                    )}`;
                    return (
                      <label
                        key={tp.id}
                        htmlFor={checkboxId}
                        className={`block p-4 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-sky-50/80 border-cerulean-600'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <input
                            id={checkboxId}
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              handleToggleTp(tp.id, e.target.checked)
                            }
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-cerulean-600 focus:ring-cerulean-600 shrink-0 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-1.5">
                              <span className="font-mono font-semibold text-navy-900">
                                {tp.tp_code}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-toska-600">
                                Elemen: {tp.element}
                              </span>
                            </div>

                            <p className="text-sm text-navy-900 leading-relaxed">
                              {tp.tp_text}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                              <span className="font-medium text-slate-600">
                                Ruang lingkup materi:
                              </span>{' '}
                              {tp.material_scope}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>Ingin menelusuri seluruh katalog TP SD Fase C?</span>
                <button
                  type="button"
                  onClick={onOpenKatalog}
                  className="font-semibold text-cerulean-600 hover:text-navy-900 transition-colors whitespace-nowrap"
                >
                  Buka Katalog TP
                </button>
              </div>
            </div>
          )}

          {/* LANGKAH 3: Komposisi Bentuk Soal (PG, MCMA, Kategori), Kognitif C1-C6, Durasi & Pengacakan */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-navy-900">
                  3. Komposisi Bentuk Soal, Tingkat Kognitif, dan Durasi
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Tentukan jumlah total soal, sebaran bentuk soal (PG Tunggal,
                  MCMA, dan Kategori), distribusi taksonomi C1–C6, durasi, serta
                  pengacakan soal.
                </p>
              </div>

              {/* Jumlah Soal, Durasi, dan Pengacakan Soal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Jumlah soal */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white">
                  <label
                    htmlFor="jumlah-soal"
                    className="block text-xs font-semibold text-slate-600 mb-2"
                  >
                    Jumlah Total Soal (Default 30)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyJumlahSoal(draft.jumlahSoal - 5)}
                      className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-navy-900 hover:bg-slate-100 transition-colors shrink-0"
                      aria-label="Kurangi 5 soal"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      id="jumlah-soal"
                      type="number"
                      min={5}
                      max={60}
                      value={jumlahSoalInput}
                      onChange={(e) => handleJumlahSoalTyping(e.target.value)}
                      onBlur={handleJumlahSoalBlur}
                      className="w-full text-center font-mono text-base font-bold text-navy-900 tabular-nums py-2 rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => applyJumlahSoal(draft.jumlahSoal + 5)}
                      className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-navy-900 hover:bg-slate-100 transition-colors shrink-0"
                      aria-label="Tambah 5 soal"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {[15, 20, 30, 40].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyJumlahSoal(preset)}
                        className={`flex-1 py-1 rounded-md text-xs font-mono tabular-nums transition-colors ${
                          draft.jumlahSoal === preset
                            ? 'bg-navy-900 text-white font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Durasi asesmen */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white">
                  <label
                    htmlFor="durasi-menit"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2"
                  >
                    <Clock className="w-3.5 h-3.5 text-toska-600" />
                    <span>Durasi Asesmen (Menit)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="durasi-menit"
                      type="number"
                      min={15}
                      max={180}
                      step={5}
                      value={draft.durasiMenit}
                      onChange={(e) =>
                        handleDurasiChange(parseInt(e.target.value, 10))
                      }
                      className="w-full px-3 py-2 font-mono text-base font-bold text-navy-900 tabular-nums rounded-lg border border-slate-200"
                    />
                    <span className="text-xs font-medium text-slate-500 shrink-0">
                      menit
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {[45, 60, 75, 90].map((mnt) => (
                      <button
                        key={mnt}
                        type="button"
                        onClick={() => handleDurasiChange(mnt)}
                        className={`flex-1 py-1 rounded-md text-xs font-mono tabular-nums transition-colors ${
                          draft.durasiMenit === mnt
                            ? 'bg-toska-600 text-white font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {mnt}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pengacakan Urutan Soal */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Shuffle className="w-3.5 h-3.5 text-cerulean-600" />
                        <span>Pengacakan Soal</span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      Urutan soal diacak otomatis untuk setiap murid saat
                      pengerjaan.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.acakSoal}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        acakSoal: !prev.acakSoal,
                      }))
                    }
                    className={`mt-3 w-full inline-flex items-center justify-between px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold border transition-colors ${
                      draft.acakSoal
                        ? 'bg-sky-50 border-cerulean-600 text-navy-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>
                      {draft.acakSoal ? 'Aktif (Diacak)' : 'Nonaktif (Berurutan)'}
                    </span>
                    <span
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                        draft.acakSoal
                          ? 'bg-cerulean-600 justify-end'
                          : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-white block" />
                    </span>
                  </button>
                </div>
              </div>

              {/* Pengaturan Bentuk Soal: PG Tunggal, MCMA, Kategori */}
              <div className="pt-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-toska-600" />
                      <span>Komposisi Bentuk Soal (PG, MCMA, Kategori)</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Atur jumlah masing-masing tipe soal. Total ketiga tipe
                      harus tepat sama dengan {draft.jumlahSoal} soal.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleAdjustTypesProportional}
                      className="inline-flex items-center justify-center px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold text-cerulean-600 bg-sky-50 hover:bg-sky-100 transition-colors whitespace-nowrap"
                    >
                      Sesuaikan Proporsional ({draft.jumlahSoal} soal)
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyDefaultTypes}
                      className="inline-flex items-center justify-center px-3 py-2 min-h-[38px] rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
                    >
                      Proporsi Bawaan
                    </button>
                  </div>
                </div>

                {/* Validasi otomatis bentuk soal */}
                {!isQuestionTypeValid && (
                  <div
                    role="alert"
                    className="bg-red-50/90 border border-red-200 rounded-xl p-4 space-y-3 text-red-950"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm space-y-1">
                        <p className="font-semibold">
                          Total bentuk soal ({totalQuestionTypes} soal) belum
                          sama dengan jumlah total soal ({draft.jumlahSoal}{' '}
                          soal).
                        </p>
                        <p className="text-red-900/90 leading-relaxed">
                          {questionTypeDiff > 0
                            ? `Komposisi bentuk soal masih kurang ${questionTypeDiff} soal.`
                            : `Komposisi bentuk soal kelebihan ${Math.abs(
                                questionTypeDiff
                              )} soal.`}{' '}
                          Sesuaikan angka PG, MCMA, atau Kategori secara manual
                          atau gunakan tombol penyesuaian proporsional.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pl-7">
                      <button
                        type="button"
                        onClick={handleAdjustTypesProportional}
                        className="inline-flex items-center justify-center px-3.5 py-2 min-h-[36px] rounded-lg text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors whitespace-nowrap"
                      >
                        Sesuaikan Bentuk Soal ke {draft.jumlahSoal} Soal
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyDefaultTypes}
                        className="inline-flex items-center justify-center px-3.5 py-2 min-h-[36px] rounded-lg text-xs font-semibold text-navy-900 bg-white border border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
                      >
                        Gunakan Proporsi Standar
                      </button>
                    </div>
                  </div>
                )}

                {typeAdjustmentFeedback && isQuestionTypeValid && (
                  <div
                    role="status"
                    className="bg-teal-50/80 border border-teal-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs sm:text-sm text-navy-900"
                  >
                    <CheckCircle2 className="w-4 h-4 text-toska-600 shrink-0 mt-0.5" />
                    <span>{typeAdjustmentFeedback}</span>
                  </div>
                )}

                {/* Visualisasi proporsi bentuk soal */}
                <div className="space-y-2">
                  <div
                    className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex"
                    aria-label="Visualisasi proporsi bentuk soal PG, MCMA, dan Kategori"
                  >
                    {QUESTION_TYPES.map((t) => {
                      const count = draft.distribusiTipeSoal[t];
                      const pct =
                        totalQuestionTypes > 0
                          ? (count / totalQuestionTypes) * 100
                          : 0;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={t}
                          style={{ width: `${pct}%` }}
                          className={`${QUESTION_TYPE_META[t].warnaBar} transition-all duration-150`}
                          title={`${QUESTION_TYPE_META[t].nama}: ${count} soal`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono tabular-nums font-semibold text-navy-900">
                      Total bentuk soal: {totalQuestionTypes} /{' '}
                      {draft.jumlahSoal} soal
                    </span>
                    {questionTypeDiff === 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-toska-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sesuai jumlah total soal
                      </span>
                    ) : questionTypeDiff > 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Kurang {questionTypeDiff} soal lagi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Kelebihan {Math.abs(questionTypeDiff)} soal
                      </span>
                    )}
                  </div>
                </div>

                {/* Input jumlah 3 tipe soal */}
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {QUESTION_TYPES.map((typeKey) => {
                    const meta = QUESTION_TYPE_META[typeKey];
                    const value = draft.distribusiTipeSoal[typeKey];
                    return (
                      <div
                        key={typeKey}
                        className="px-4 py-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-sm ${meta.warnaBar} shrink-0`}
                              aria-hidden="true"
                            />
                            <span className="text-sm font-semibold text-navy-900">
                              {meta.nama}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {meta.deskripsi}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleQuestionTypeStep(typeKey, -1)}
                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-navy-900 hover:bg-slate-100 transition-colors"
                            aria-label={`Kurangi soal ${meta.nama}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={value}
                            onChange={(e) =>
                              handleQuestionTypeInput(typeKey, e.target.value)
                            }
                            aria-label={`Jumlah soal ${meta.nama}`}
                            className="w-14 text-center font-mono text-sm font-semibold text-navy-900 tabular-nums py-1.5 rounded-lg border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuestionTypeStep(typeKey, 1)}
                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-navy-900 hover:bg-slate-100 transition-colors"
                            aria-label={`Tambah soal ${meta.nama}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Distribusi Tingkat Kognitif C1-C6 */}
              <div className="pt-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-cerulean-600" />
                      <span>Distribusi Tingkat Kognitif (C1 – C6)</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Pastikan jumlah seluruh tingkat kognitif tepat sama dengan
                      target jumlah soal.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleAdjustProportional}
                      className="inline-flex items-center justify-center px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold text-cerulean-600 bg-sky-50 hover:bg-sky-100 transition-colors whitespace-nowrap"
                    >
                      Sesuaikan Proporsional ({draft.jumlahSoal} soal)
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyDefaultProportion}
                      className="inline-flex items-center justify-center px-3 py-2 min-h-[38px] rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
                    >
                      Proporsi Bawaan
                    </button>
                  </div>
                </div>

                {/* Pemberitahuan transparan bila jumlah soal diubah atau distribusi tidak sesuai */}
                {!isCognitiveValid && (
                  <div
                    role="alert"
                    className="bg-red-50/90 border border-red-200 rounded-xl p-4 space-y-3 text-red-950"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm space-y-1">
                        <p className="font-semibold">
                          {jumlahSoalChangedPrompt
                            ? `Jumlah soal berubah menjadi ${draft.jumlahSoal} soal — distribusi C1–C6 belum disesuaikan.`
                            : `Jumlah distribusi C1–C6 (${totalCognitive} soal) belum sama dengan jumlah soal (${draft.jumlahSoal} soal).`}
                        </p>
                        <p className="text-red-900/90 leading-relaxed">
                          {cognitiveDiff > 0
                            ? `Saat ini distribusi masih kurang ${cognitiveDiff} soal.`
                            : `Saat ini distribusi kelebihan ${Math.abs(
                                cognitiveDiff
                              )} soal.`}{' '}
                          Angka distribusi tidak diubah secara otomatis. Silakan
                          klik tombol penyesuaian proporsional atau ubah angka
                          C1–C6 secara manual sebelum melanjutkan ke tahap
                          berikutnya.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-7">
                      <button
                        type="button"
                        onClick={handleAdjustProportional}
                        className="inline-flex items-center justify-center px-3.5 py-2 min-h-[36px] rounded-lg text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors whitespace-nowrap"
                      >
                        Sesuaikan Secara Proporsional ke {draft.jumlahSoal} Soal
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyDefaultProportion}
                        className="inline-flex items-center justify-center px-3.5 py-2 min-h-[36px] rounded-lg text-xs font-semibold text-navy-900 bg-white border border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
                      >
                        Atur Ulang ke Proporsi Standar
                      </button>
                    </div>
                  </div>
                )}

                {adjustmentFeedback && isCognitiveValid && (
                  <div
                    role="status"
                    className="bg-teal-50/80 border border-teal-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs sm:text-sm text-navy-900"
                  >
                    <CheckCircle2 className="w-4 h-4 text-toska-600 shrink-0 mt-0.5" />
                    <span>{adjustmentFeedback}</span>
                  </div>
                )}

                {/* Visualisasi proporsi bar */}
                <div className="space-y-2">
                  <div
                    className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex"
                    aria-label="Visualisasi proporsi tingkat kognitif C1 sampai C6"
                  >
                    {COGNITIVE_LEVELS.map((lvl) => {
                      const count = draft.distribusiKognitif[lvl];
                      const pct =
                        totalCognitive > 0 ? (count / totalCognitive) * 100 : 0;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={lvl}
                          style={{ width: `${pct}%` }}
                          className={`${COGNITIVE_LEVEL_META[lvl].warnaBar} transition-all duration-150`}
                          title={`${lvl} (${COGNITIVE_LEVEL_META[lvl].nama}): ${count} soal`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono tabular-nums font-semibold text-navy-900">
                      Total terdistribusi: {totalCognitive} / {draft.jumlahSoal}{' '}
                      soal
                    </span>
                    {cognitiveDiff === 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-toska-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sesuai target jumlah soal
                      </span>
                    ) : cognitiveDiff > 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Kurang {cognitiveDiff} soal lagi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Kelebihan {Math.abs(cognitiveDiff)} soal
                      </span>
                    )}
                  </div>
                </div>

                {/* Daftar input C1-C6 */}
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {COGNITIVE_LEVELS.map((lvl) => {
                    const meta = COGNITIVE_LEVEL_META[lvl];
                    const value = draft.distribusiKognitif[lvl];
                    return (
                      <div
                        key={lvl}
                        className="px-4 py-3 bg-white flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-sm ${meta.warnaBar} shrink-0`}
                              aria-hidden="true"
                            />
                            <span className="font-mono text-xs font-bold text-navy-900">
                              {lvl}
                            </span>
                            <span className="text-sm font-semibold text-navy-900">
                              {meta.nama}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {meta.deskripsi}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCognitiveStep(lvl, -1)}
                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-navy-900 hover:bg-slate-100 transition-colors"
                            aria-label={`Kurangi soal ${lvl}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={value}
                            onChange={(e) =>
                              handleCognitiveInput(lvl, e.target.value)
                            }
                            aria-label={`Jumlah soal ${lvl} ${meta.nama}`}
                            className="w-14 text-center font-mono text-sm font-semibold text-navy-900 tabular-nums py-1.5 rounded-lg border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleCognitiveStep(lvl, 1)}
                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-navy-900 hover:bg-slate-100 transition-colors"
                            aria-label={`Tambah soal ${lvl}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* LANGKAH 4: Tinjau Rancangan & Informasi Persetujuan Guru */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-navy-900">
                  4. Tinjau Rancangan Asesmen
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Periksa kembali keseluruhan parameter dan Tujuan Pembelajaran
                  terpilih yang akan menjadi dasar pembuatan soal oleh AI.
                </p>
              </div>

              {/* Informasi wajib pemeriksaan guru */}
              <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-toska-600 shrink-0 mt-0.5" />
                <div className="text-sm text-navy-900 space-y-1">
                  <p className="font-semibold">
                    Soal akan dihasilkan AI dan wajib diperiksa serta disetujui
                    guru sebelum diterbitkan.
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Seluruh Tujuan Pembelajaran terpilih dari katalog Supabase
                    diteruskan sebagai acuan penyusunan soal. Guru memasukkan
                    API Key AI pribadi (BYOK) per sesi pembuatan tanpa disimpan
                    permanen.
                  </p>
                </div>
              </div>

              {/* Ringkasan tabel terstruktur */}
              <dl className="divide-y divide-slate-200 border border-slate-200 rounded-xl text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-3">
                  <dt className="text-slate-500 font-medium">Judul Asesmen</dt>
                  <dd className="sm:col-span-2 font-semibold text-navy-900">
                    {draft.judul}
                  </dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-3">
                  <dt className="text-slate-500 font-medium">
                    Jenjang · Fase · Kelas Peserta
                  </dt>
                  <dd className="sm:col-span-2 font-medium text-navy-900">
                    {draft.jenjang} · Fase {draft.fase} (otomatis) · Peserta{' '}
                    <strong>Kelas {draft.kelas}</strong>
                  </dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-3">
                  <dt className="text-slate-500 font-medium">Mata Pelajaran</dt>
                  <dd className="sm:col-span-2 font-medium text-navy-900">
                    {draft.mataPelajaranNama}
                  </dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-3">
                  <dt className="text-slate-500 font-medium">
                    Jumlah, Durasi &amp; Pengacakan
                  </dt>
                  <dd className="sm:col-span-2 font-medium text-navy-900 tabular-nums">
                    {draft.jumlahSoal} soal · {draft.durasiMenit} menit ·{' '}
                    {draft.acakSoal
                      ? 'Urutan soal diacak per murid'
                      : 'Urutan soal tetap'}
                  </dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-3">
                  <dt className="text-slate-500 font-medium">
                    Komposisi Bentuk Soal
                  </dt>
                  <dd className="sm:col-span-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-navy-900 tabular-nums">
                    {QUESTION_TYPES.map((t) => (
                      <span key={t}>
                        <strong className="font-semibold">
                          {QUESTION_TYPE_META[t].singkatan}:
                        </strong>{' '}
                        {draft.distribusiTipeSoal[t]} soal
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-3">
                  <dt className="text-slate-500 font-medium">
                    Distribusi Kognitif
                  </dt>
                  <dd className="sm:col-span-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-navy-900 tabular-nums">
                    {COGNITIVE_LEVELS.map((lvl) => (
                      <span key={lvl}>
                        <strong className="font-semibold">{lvl}:</strong>{' '}
                        {draft.distribusiKognitif[lvl]}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
                  <dt className="text-slate-500 font-medium">
                    Tujuan Pembelajaran ({selectedTPIds.length})
                  </dt>
                  <dd className="sm:col-span-2 space-y-3">
                    {selectedTps.map((tp) => (
                      <div key={tp.id} className="text-xs leading-relaxed">
                        <div className="flex flex-wrap items-center gap-x-2 text-slate-500 mb-0.5">
                          <span className="font-mono font-semibold text-navy-900">
                            {tp.tp_code}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-toska-600 font-medium">
                            {tp.element}
                          </span>
                        </div>
                        <p className="text-navy-900">{tp.tp_text}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Ruang lingkup: {tp.material_scope}
                        </p>
                      </div>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Bar tombol navigasi bawah formulir */}
          <div className="pt-5 border-t border-slate-200 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={goPrevStep}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-navy-900 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>
            ) : (
              <span />
            )}

            {currentStep < 4 ? (
              <div className="flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  disabled={isStep3Blocked}
                  onClick={goNextStep}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-cerulean-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Lanjut</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {isStep3Blocked && (
                  <span className="text-[11px] font-medium text-red-700 text-right">
                    Pastikan total bentuk soal dan total C1–C6 masing-masing
                    sama dengan {draft.jumlahSoal} soal.
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={
                  draft.kelas === null ||
                  selectedTPIds.length === 0 ||
                  !isQuestionTypeValid ||
                  !isCognitiveValid ||
                  isProceedingToAi
                }
                onClick={() => {
                  const err =
                    validateStep(1) || validateStep(2) || validateStep(3);
                  if (err) {
                    setValidationMessage(err);
                    return;
                  }
                  onProceedToAi(buildSubmissionDraft());
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
              >
                {isProceedingToAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4 text-toska-500" />
                    <span>Buat Soal dengan AI</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Panel Ringkasan Rancangan (Kanan) */}
        <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 xl:sticky xl:top-24 space-y-5">
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-navy-900">
              Ringkasan Rancangan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Diperbarui otomatis saat Anda mengisi formulir.
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Judul Asesmen</dt>
              <dd className="font-semibold text-navy-900 mt-0.5">
                {draft.judul.trim() || 'Belum diisi'}
              </dd>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <dt className="text-xs text-slate-500">Cakupan</dt>
                <dd className="font-semibold text-navy-900 mt-0.5">
                  SD · Fase C
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Kelas Peserta</dt>
                <dd className="font-semibold text-navy-900 mt-0.5">
                  {draft.kelas !== null ? `Kelas ${draft.kelas}` : 'Belum dipilih'}
                </dd>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <dt className="text-xs text-slate-500">Mata Pelajaran</dt>
              <dd className="font-semibold text-navy-900 mt-0.5">
                {draft.mataPelajaranNama || 'Belum dipilih'}
              </dd>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <dt className="text-xs text-slate-500">Tujuan Pembelajaran</dt>
              <dd className="font-semibold text-navy-900 mt-0.5 tabular-nums">
                {selectedTPIds.length > 0
                  ? `${selectedTPIds.length} TP dipilih`
                  : 'Belum ada TP dipilih'}
              </dd>
              {selectedTps.length > 0 && (
                <ul className="mt-2 space-y-1 max-h-[132px] overflow-y-auto pr-1">
                  {selectedTps.map((tp) => (
                    <li
                      key={tp.id}
                      className="flex items-center justify-between gap-2 text-[11px] text-slate-600"
                    >
                      <span className="font-mono font-medium text-navy-900 shrink-0">
                        {tp.tp_code}
                      </span>
                      <span className="text-slate-500 truncate">
                        {tp.element}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
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
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <dt className="text-xs text-slate-500">Bentuk Soal</dt>
                <span
                  className={`font-mono text-[11px] font-semibold tabular-nums ${
                    isQuestionTypeValid ? 'text-toska-600' : 'text-red-700'
                  }`}
                >
                  {totalQuestionTypes} / {draft.jumlahSoal} soal
                </span>
              </div>
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
              {!isQuestionTypeValid && (
                <p className="mt-1.5 text-xs font-medium text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {questionTypeDiff > 0
                      ? `Kurang ${questionTypeDiff} soal`
                      : `Kelebihan ${Math.abs(questionTypeDiff)} soal`}
                  </span>
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <dt className="text-slate-500">Pengacakan Soal</dt>
              <dd className="font-semibold text-navy-900">
                {draft.acakSoal ? 'Aktif (Diacak)' : 'Berurutan'}
              </dd>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <dt className="text-xs text-slate-500">Sebaran C1 – C6</dt>
                <span
                  className={`font-mono text-[11px] font-semibold tabular-nums ${
                    isCognitiveValid ? 'text-toska-600' : 'text-red-700'
                  }`}
                >
                  {totalCognitive} / {draft.jumlahSoal} soal
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
              <p
                className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${
                  isCognitiveValid ? 'text-toska-600' : 'text-red-700'
                }`}
              >
                {isCognitiveValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Distribusi sesuai jumlah soal</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {cognitiveDiff > 0
                        ? `Belum sesuai (kurang ${cognitiveDiff} soal)`
                        : `Belum sesuai (kelebihan ${Math.abs(
                            cognitiveDiff
                          )} soal)`}
                    </span>
                  </>
                )}
              </p>
            </div>
          </dl>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Soal hasil AI selalu ditinjau dan disetujui guru terlebih dahulu
              sebelum dibagikan kepada murid.
            </p>

            <button
              type="button"
              disabled={
                draft.kelas === null ||
                selectedTPIds.length === 0 ||
                !isQuestionTypeValid ||
                !isCognitiveValid ||
                isProceedingToAi
              }
              onClick={() => {
                if (
                  draft.kelas === null ||
                  selectedTPIds.length === 0 ||
                  !isQuestionTypeValid ||
                  !isCognitiveValid
                ) {
                  return;
                }
                onProceedToAi(buildSubmissionDraft());
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 active:bg-navy-950 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              {isProceedingToAi ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Menyiapkan Konfigurasi AI...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4 text-toska-500 shrink-0" />
                  <span>Buat Soal dengan AI</span>
                </>
              )}
            </button>

            {draft.kelas === null ? (
              <p className="text-[11px] text-slate-500 text-center">
                Pilih Kelas Peserta (Kelas 5 atau 6) terlebih dahulu.
              </p>
            ) : selectedTPIds.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center">
                Pilih minimal 1 Tujuan Pembelajaran untuk mengaktifkan tombol
                ini.
              </p>
            ) : !isQuestionTypeValid ? (
              <p className="text-[11px] font-medium text-red-700 text-center">
                Samakan total bentuk soal ({totalQuestionTypes}/
                {draft.jumlahSoal} soal) terlebih dahulu.
              </p>
            ) : !isCognitiveValid ? (
              <p className="text-[11px] font-medium text-red-700 text-center">
                Samakan distribusi C1–C6 ({totalCognitive}/{draft.jumlahSoal}{' '}
                soal) terlebih dahulu.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
